import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { decryptPrivate } from "./private-delivery";

export class MigrationError extends Error {}
// Parent records precede their dependants. RateLimit is transient and remains local to Neon.
const tables = ["User", "Product", "OrderCounter", "Order", "OrderItem", "WalletEvent", "PasswordReset", "BannerImage", "CatalogImageAsset", "StoreSettings", "CatalogOrder", "PendingRegistration", "CheckoutAttempt", "StreamingAccess"];
const core = new Set(["User", "Product", "Order", "OrderItem", "WalletEvent"]);
type Row = Record<string, unknown>;
type Delegate = {
  count(): Promise<number>;
  findMany(args: unknown): Promise<Row[]>;
  createMany(args: { data: Row[] }): Promise<{ count: number }>;
};
function delegate(client: Prisma.TransactionClient, table: string) {
  return (client as unknown as Record<string, Delegate>)[table[0].toLowerCase() + table.slice(1)];
}
function identity(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new MigrationError("Conexión inválida: usa una conexión PostgreSQL completa en ambas variables privadas."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) throw new MigrationError("SOURCE_DATABASE_URL y TARGET_DATABASE_URL deben ser conexiones PostgreSQL completas.");
  if (url.searchParams.has("schema") && url.searchParams.get("schema") !== "public") throw new MigrationError("La migración solo admite el esquema public de la tienda.");
  return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
}
function canonical(value: unknown): unknown {
  if (value instanceof Date) return { date: value.toISOString() };
  if (value instanceof Uint8Array) return { bytes: Buffer.from(value).toString("base64") };
  if (typeof value === "bigint") return { bigint: value.toString() };
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, child]) => [key, canonical(child)]));
  return value;
}
function checksum(rows: Row[]) {
  const hashes = rows.map(row => createHash("sha256").update(JSON.stringify(canonical(row))).digest("hex")).sort();
  return createHash("sha256").update(hashes.join("\n")).digest("hex");
}
async function columns(client: Prisma.TransactionClient) {
  const rows = await client.$queryRaw<{ table_name: string; column_name: string }[]>`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`;
  const result = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!result.has(row.table_name)) result.set(row.table_name, new Set());
    result.get(row.table_name)!.add(row.column_name);
  }
  return result;
}
export async function migrateStore(options: { sourceURL: string; targetURL: string; apply?: boolean; log?: (message: string) => void }) {
  if (!options.sourceURL || !options.targetURL) throw new MigrationError("Configura SOURCE_DATABASE_URL (Supabase) y TARGET_DATABASE_URL (Neon) en .env.migration. No pegues claves en el chat.");
  if (identity(options.sourceURL) === identity(options.targetURL)) throw new MigrationError("Origen y destino parecen la misma base de datos. No se ejecutó la migración.");
  const log = options.log || (() => {});
  const source = new PrismaClient({ datasourceUrl: options.sourceURL, log: [] });
  const target = new PrismaClient({ datasourceUrl: options.targetURL, log: [] });
  let stage = "conexión";
  try {
    return await source.$transaction(async from => {
      await from.$executeRaw`SET TRANSACTION READ ONLY`;
      const sourceColumns = await columns(from);
      return target.$transaction(async to => {
        const targetColumns = await columns(to);
        const plan = tables.map(table => {
          const model = Prisma.dmmf.datamodel.models.find(model => model.name === table)!;
          const fields = model.fields.filter(field => field.kind !== "object");
          const available = sourceColumns.get(table);
          if (!targetColumns.has(table) || fields.some(field => !targetColumns.get(table)!.has(field.name))) throw new MigrationError("El esquema de Neon no está actualizado. Apunta DATABASE_URL a Neon y ejecuta npm run db:push.");
          if (!available && core.has(table)) throw new MigrationError(`Falta ${table} en el origen. Comprueba que SOURCE_DATABASE_URL apunta a la tienda de Supabase correcta.`);
          if (available && [...available].some(column => !fields.some(field => field.name === column))) throw new MigrationError(`Hay columnas adicionales en ${table} de Supabase. Revisa el esquema antes de copiar para no perder datos.`);
          if (available && fields.some(field => field.isRequired && !field.hasDefaultValue && !available.has(field.name))) throw new MigrationError(`El esquema del origen no es compatible en ${table}. No se copiaron datos.`);
          const selected = fields.filter(field => available?.has(field.name));
          return { table, model, selected, select: Object.fromEntries(selected.map(field => [field.name, true])), exists: Boolean(available), key: fields.find(field => field.isId)!.name };
        });
        if (options.apply) {
          // Prevent registrations, purchases and seed writes from racing the empty-target check.
          await to.$executeRaw`SET LOCAL lock_timeout = '5s'`;
          await to.$executeRaw(Prisma.sql`LOCK TABLE ${Prisma.join(tables.map(table => Prisma.raw(`"public"."${table}"`)))} IN EXCLUSIVE MODE`);
        }
        const counts: { table: string; source: number; target: number }[] = [];
        for (const entry of plan) {
          stage = `comprobación ${entry.table}`;
          const sourceCount = entry.exists ? await delegate(from, entry.table).count() : 0;
          const targetCount = await delegate(to, entry.table).count();
          log(`${entry.table}: Supabase=${sourceCount}, Neon=${targetCount}`);
          counts.push({ table: entry.table, source: sourceCount, target: targetCount });
        }
        if (counts.some(row => row.target !== 0)) throw new MigrationError("Neon ya contiene datos de la tienda. No se borró ni sobrescribió nada. Esta herramienta solo admite un destino vacío; no ejecutes seed antes de migrar.");
        if (!counts.some(row => row.source > 0)) throw new MigrationError("El origen está vacío. Comprueba la conexión de Supabase antes de continuar.");
        let highestReference = 0, savedCounter = 0;
        for (const entry of plan) {
          if (!entry.exists) continue;
          stage = `lectura ${entry.table}`;
          const expected = counts.find(row => row.table === entry.table)!.source;
          for (let offset = 0; offset < expected; offset += 50) {
            const rows = await delegate(from, entry.table).findMany({ select: entry.select, orderBy: { [entry.key]: "asc" }, skip: offset, take: 50 });
            for (const row of rows) {
              // Check the existing key without logging or rewriting any decrypted value.
              for (const field of ["deliveryCipher", "receiptCipher", "cipher"]) {
                if (typeof row[field] === "string") {
                  try { decryptPrivate(row[field]); }
                  catch { throw new MigrationError("No se pudieron descifrar accesos/comprobantes. Conserva en .env el AUTH_SECRET y DELIVERY_SECRET originales antes de migrar."); }
                }
              }
              if (entry.table === "Order" && typeof row.reference === "string" && /^P\d+$/.test(row.reference)) highestReference = Math.max(highestReference, Number(row.reference.slice(1)));
              if (entry.table === "OrderCounter" && row.id === "orders") savedCounter = Number(row.value);
            }
            if (options.apply) {
              stage = `copia ${entry.table}`;
              const data = rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, entry.selected.find(field => field.name === key)?.type === "Json" && value === null ? Prisma.JsonNull : value])));
              const inserted = await delegate(to, entry.table).createMany({ data });
              if (inserted.count !== rows.length) throw new MigrationError(`Conteo inesperado en ${entry.table}. La transacción se canceló.`);
              const copied = await delegate(to, entry.table).findMany({ select: entry.select, where: { [entry.key]: { in: rows.map(row => row[entry.key]) } } });
              if (checksum(rows) !== checksum(copied)) throw new MigrationError(`La verificación de contenido falló en ${entry.table}. La transacción se canceló.`);
            }
          }
          if (options.apply && await delegate(to, entry.table).count() !== expected) throw new MigrationError(`Conteo final incorrecto en ${entry.table}. La transacción se canceló.`);
          log(`${entry.table}: ${options.apply ? "copiada y verificada" : "lectura validada"} (${expected}).`);
        }
        if (options.apply && highestReference > savedCounter) {
          if (!Number.isSafeInteger(highestReference) || highestReference >= 2147483647) throw new MigrationError("El contador de pedidos requiere revisión. La transacción se canceló.");
          await to.orderCounter.upsert({ where: { id: "orders" }, create: { id: "orders", value: highestReference }, update: { value: highestReference } });
          log("Contador de pedidos ajustado para no repetir referencias existentes.");
        }
        log(options.apply ? "Migración verificada; confirmando la transacción. Supabase permanece intacto." : "Comprobación completada sin escrituras. Ejecuta npm run db:migrate:apply para copiar.");
        return counts;
      }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 600000 });
    }, { isolationLevel: "RepeatableRead", maxWait: 10000, timeout: 660000 });
  } catch (error) {
    if (error instanceof MigrationError) throw error;
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "DATABASE";
    throw new MigrationError(`Falló la migración durante ${stage} (${code}). La copia es transaccional y Supabase no se modifica. Si hubo una desconexión al confirmar, comprueba Neon antes de reintentar. Revisa conexiones, permisos y esquema. No se muestran claves ni registros privados.`);
  } finally { await Promise.allSettled([source.$disconnect(), target.$disconnect()]); }
}

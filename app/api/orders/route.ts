import { managedAccountProductIds, accessForProduct, accessProductIds, syncStreamingStocks } from "@/lib/shared-streaming";
import { comboPools, loadComboInventory } from "@/lib/combo-inventory";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { disabledClientCategories } from "@/lib/store-settings";
import { encryptPrivate, decryptPrivate, deliverySchema, receiptText } from "@/lib/private-delivery";
import { availableAccess } from "@/lib/streaming-inventory";
import { mergeCart, cartSignature } from "@/lib/cart";
import { secureMutation } from "@/lib/security";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
const schema = z.object({
  checkoutKey: z.uuid().optional(),
  items: z.array(z.object({ id: z.string().min(1).max(100), qty: z.number().int().min(1).max(50) })).min(1).max(50),
});
class PurchaseError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Inicia sesión.", 401);
  return reply({ orders: await db.order.findMany({ where: { userId: user.id }, include: { items: { select: { id: true, productId: true, name: true, category: true, quantity: true, unitPrice: true } } }, orderBy: { createdAt: "desc" }, take: 50 }) });
}
function retryable(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002" || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))));
}
async function handlePOST(req: Request) {
  const user = await getUser();
  if (!user) return fail("Inicia sesión.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Carrito inválido. Revisa los productos y las cantidades.");
  const items = mergeCart(parsed.data.items).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (items.some(item => item.qty > 50)) return fail("No puedes comprar más de 50 unidades del mismo producto por pedido.");
  const checkoutKey = parsed.data.checkoutKey;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await db.$transaction(async tx => {
        if (checkoutKey) {
          const saved = await tx.checkoutAttempt.findUnique({ where: { key: checkoutKey }, include: { order: { include: { items: { select: { productId: true, quantity: true } } } } } });
          const existing = saved?.order;
          if (existing) {
            if (existing.userId !== user.id || cartSignature(existing.items.map(item => ({ id: item.productId, qty: item.quantity }))) !== cartSignature(items)) throw new PurchaseError("Esta solicitud de compra no corresponde a este carrito.", 409);
            return { order: existing, replayed: true };
          }
        }
        const settings = await tx.storeSettings.findUnique({ where: { id: "main" } });
        const blocked = disabledClientCategories(user.role, settings || { tiendaEnabled: true, segundaEnabled: true });
        const products = await tx.product.findMany({ where: { id: { in: items.map(item => item.id) } } });
        if (products.length !== items.length) throw new PurchaseError("Hay productos que ya no están disponibles. Actualiza tu carrito.");
        const managedAccounts = await managedAccountProductIds(tx, products);
        const byId = new Map(products.map(product => [product.id, product]));
        let total = 0;
        const accesses = new Map<string, z.infer<typeof deliverySchema>[]>();
        const assignments: { id: string; productId: string }[] = [];
        const selectedAccesses = new Set<string>();
        const reservations = new Map<string, number>();
        const reserve = (id: string, qty: number) => reservations.set(id, (reservations.get(id) || 0) + qty);
        const comboLabels = new Map<string, string[]>();
        const combos = products.filter(product => product.category === "Combos");
        const comboInventory = combos.length ? await loadComboInventory(tx, combos) : null;
        // Standalone accesses are selected first, so bundles cannot select the same access again.
        const allocationItems = [...items].sort((a, b) => Number(byId.get(a.id)!.category === "Combos") - Number(byId.get(b.id)!.category === "Combos"));
        for (const item of allocationItems) {
          const product = byId.get(item.id)!;
          if (blocked.includes(product.category)) throw new PurchaseError("Esta sección está deshabilitada temporalmente para clientes.");
          if (managedAccounts.has(product.id)) {
            const rows = await tx.streamingAccess.findMany({ where: { ...accessForProduct(product.id), ...availableAccess, id: { notIn: [...selectedAccesses] } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: item.qty });
            if (rows.length !== item.qty) throw new PurchaseError(`${product.name}: no hay suficientes accesos individuales disponibles. Ajusta la cantidad o contacta con soporte.`);
            try { accesses.set(product.id, rows.map(row => deliverySchema.parse(JSON.parse(decryptPrivate(row.cipher))))); }
            catch { throw new PurchaseError(`${product.name}: no se pudo preparar el acceso. Contacta con soporte.`, 503); }
            assignments.push(...rows.map(row => ({ id: row.id, productId: product.id })));
            rows.forEach(row => selectedAccesses.add(row.id));
          } else if (product.category === "Combos") {
            if (product.stock < item.qty) throw new PurchaseError(`${product.name}: no hay suficientes combos disponibles.`);
            if (!product.active) throw new PurchaseError(`${product.name}: el combo no está disponible.`);
            const pools = comboPools(product, comboInventory!);
            if (!pools.length) throw new PurchaseError(`${product.name}: revisa las plataformas del combo. Solo se permiten perfiles individuales; Netflix debe usar x28 días.`);
            const deliveries: z.infer<typeof deliverySchema>[] = [], labels: string[] = [];
            for (const pool of pools) {
              const units = pool.filter(unit => !selectedAccesses.has(unit.id)).slice(0, item.qty);
              if (units.length !== item.qty) throw new PurchaseError(`${product.name}: no hay suficientes perfiles individuales para todas las plataformas del combo.`);
              for (const unit of units) {
                selectedAccesses.add(unit.id); reserve(unit.source.id, 1);
                assignments.push({ id: unit.id, productId: product.id });
                deliveries.push(unit.delivery); labels.push(unit.source.name);
              }
            }
            accesses.set(product.id, deliveries); comboLabels.set(product.id, labels);
          } else {
            if (product.stock < item.qty) throw new PurchaseError(`${product.name}: pediste ${item.qty}, pero hay ${product.stock} unidades disponibles.`);
            if (product.deliveryCipher && ["Música", "Productividad"].includes(product.category)) {
              try { accesses.set(product.id, [deliverySchema.parse(JSON.parse(decryptPrivate(product.deliveryCipher)))]); }
              catch { throw new PurchaseError(`${product.name}: no se pudo preparar el acceso. Contacta con soporte.`, 503); }
            }
          }
          reserve(product.id, item.qty);
          total += product.price * item.qty;
        }
        if (!Number.isSafeInteger(total) || total < 1 || total > 2147483647) throw new PurchaseError("Total inválido.");
        const counter = await tx.orderCounter.upsert({ where: { id: "orders" }, create: { id: "orders", value: 1 }, update: { value: { increment: 1 } } });
        const reference = "P" + counter.value, date = new Date();
        // Sync source stock, then reserve aggregate quantities shared by singles and all bundles.
        const streamingSources = await tx.product.findMany({ where: { id: { in: [...reservations.keys()] } }, select: { id: true, category: true } });
        const managedSources = await managedAccountProductIds(tx, streamingSources);
        for (const source of streamingSources.filter(source => managedSources.has(source.id))) {
          const stock = await tx.streamingAccess.count({ where: { ...accessForProduct(source.id), ...availableAccess } });
          await tx.product.update({ where: { id: source.id }, data: { stock } });
        }
        const values = Prisma.join([...reservations].sort(([a], [b]) => a.localeCompare(b)).map(([id, qty]) => Prisma.sql`(${id}::text, ${qty}::integer)`));
        const reserved = await tx.$executeRaw`UPDATE "Product" AS product SET "stock" = product."stock" - cart.qty FROM (VALUES ${values}) AS cart(id, qty) WHERE product.id = cart.id AND product."stock" >= cart.qty`;
        if (reserved !== reservations.size) throw new PurchaseError("El stock cambió durante la compra. Revisa las cantidades e inténtalo de nuevo.");
        const debit = await tx.user.updateMany({ where: { id: user.id, balance: { gte: total } }, data: { balance: { decrement: total } } });
        if (!debit.count) throw new PurchaseError("Saldo insuficiente para el total del carrito.");
        const itemIds = new Map(items.map(item => [item.id, randomUUID()]));
        const order = await tx.order.create({ data: {
          id: randomUUID(), reference, createdAt: date, userId: user.id, total,
          status: accesses.size === items.length ? "ENTREGADO" : "PENDIENTE_ENTREGA",
          items: { createMany: { data: items.map(item => {
            const product = byId.get(item.id)!, access = accesses.get(item.id);
            return { id: itemIds.get(product.id)!, productId: product.id, category: product.category, sellerId: product.ownerId, name: product.name, quantity: item.qty, unitPrice: product.price, receiptCipher: access ? encryptPrivate((product.category === "Combos" ? `*Combo: ${product.name}*\nCantidad: ${item.qty}\nTotal del combo: $${new Intl.NumberFormat("es-CO").format(product.price * item.qty)} COP\n\n` : "") + access.map((unit, index) => (managedAccounts.has(product.id) && access.length > 1 ? `Acceso ${index + 1} de ${access.length}\n\n` : "") + receiptText(unit, comboLabels.get(product.id)?.[index] || product.name, reference, date, (managedAccounts.has(product.id) || product.category === "Combos") ? 1 : item.qty, product.category === "Combos" ? null : managedAccounts.has(product.id) ? product.price : product.price * item.qty)).join("\n\n────────────────────\n\n")) : null };
          }) } },
        } });
        for (const item of items) {
          const ids = assignments.filter(row => row.productId === item.id).map(row => row.id);
          if (!ids.length) continue;
          const claimed = await tx.streamingAccess.updateMany({ where: { id: { in: ids }, ...availableAccess }, data: { soldAt: date, orderItemId: itemIds.get(item.id)!, version: { increment: 1 } } });
          if (claimed.count !== ids.length) throw new PurchaseError("Un acceso acaba de venderse. Inténtalo de nuevo.", 409);
        }
        if (assignments.length) {
          const soldRows = await tx.streamingAccess.findMany({ where: { id: { in: assignments.map(row => row.id) } }, select: { productId: true, productIds: true } });
          await syncStreamingStocks(tx, soldRows.flatMap(accessProductIds));
        }
        if (checkoutKey) await tx.checkoutAttempt.create({ data: { key: checkoutKey, orderId: order.id } });
        await tx.walletEvent.create({ data: { userId: user.id, amount: -total, type: "COMPRA", note: `Pedido ${reference}` } });
        return { order, replayed: false };
      }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 });
      return reply({ orderId: result.order.id, reference: result.order.reference, total: result.order.total }, result.replayed ? 200 : 201);
    } catch (error) {
      if (retryable(error) && attempt < 2) continue;
      if (error instanceof PurchaseError) return fail(error.message, error.status);
      return fail(checkoutKey ? "No se pudo completar la compra. Inténtalo de nuevo; el reintento recuperará tu pedido si ya fue confirmado." : "No se pudo completar la compra. Inténtalo de nuevo.", 503);
    }
  }
  return fail("No se pudo completar la compra. Inténtalo de nuevo.", 503);
}
export const POST = secureMutation(handlePOST);

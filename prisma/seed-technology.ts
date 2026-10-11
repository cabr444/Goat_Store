import { PrismaClient } from "@prisma/client";
import { technologyProducts } from "../lib/technology-products";
const db = new PrismaClient();
async function main() {
  let added = 0;
  // Serialize seeds so repeated or concurrent runs do not duplicate items.
  await db.$transaction(
    async (tx) => {
      // PostgreSQL returns void here; cast it so Prisma can deserialize the result.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(719504)::text`;
      const existing = await tx.product.findMany({
        where: {ownerId: null, category: {in: [...new Set(technologyProducts.map(p => p.category))]}},
        select: {name: true, category: true},
      });
      const keys = new Set(existing.map(p => JSON.stringify([p.category, p.name])));
      const missing = technologyProducts.filter(p => !keys.has(JSON.stringify([p.category, p.name])));
      if (missing.length) {
        const result = await tx.product.createMany({data: missing});
        added = result.count;
      }
    },
    { timeout: 60000, maxWait: 10000 },
  );
  console.log(
    `Tecnología: ${added} productos agregados. Precios de ejemplo en COP.`,
  );
}
main()
  .catch((error: unknown) => {
    const candidate = error as {code?: unknown; errorCode?: unknown; meta?: {code?: unknown}};
    const codes = [candidate?.code, candidate?.errorCode, candidate?.meta?.code].filter((code): code is string => typeof code === "string" && /^[A-Z0-9]{5}$/.test(code));
    console.error(
      "No se pudo crear el catálogo de tecnología." + (codes.length ? ` Código: ${codes.join(" / ")}.` : " Sin código de error disponible."),
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

import { PrismaClient } from "@prisma/client";
import { technologyProducts } from "../lib/technology-products";
const db = new PrismaClient();
async function main() {
  let added = 0;
  // Serialize seeds so repeated or concurrent runs do not duplicate items.
  await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(719504)`;
      for (const product of technologyProducts) {
        const exists = await tx.product.findFirst({
          where: {
            name: product.name,
            category: product.category,
            ownerId: null,
          },
        });
        if (!exists) {
          await tx.product.create({ data: product });
          added++;
        }
      }
    },
    { timeout: 30000 },
  );
  console.log(
    `Tecnología: ${added} productos agregados. Precios de ejemplo en COP.`,
  );
}
main()
  .catch(() => {
    console.error(
      "No se pudo crear el catálogo de tecnología. Revisa DATABASE_URL y el esquema.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

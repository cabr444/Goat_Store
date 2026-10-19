import { db } from "./db";
import { courseProducts } from "./course-products";
export async function seedCourses() {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(719506)::text`;
    const existing = await tx.product.findMany({ where: { id: { in: courseProducts.map(product => product.id) } }, select: { id: true } });
    const ids = new Set(existing.map(product => product.id));
    const missing = courseProducts.filter(product => !ids.has(product.id));
    if (missing.length) await tx.product.createMany({ data: missing });
    return missing.length;
  }, { timeout: 30000, maxWait: 10000 });
}

import { db } from "./db";
import { courseProducts, previousCourseNames } from "./course-products";
export async function seedCourses() {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(719506)::text`;
    const existing = await tx.product.findMany({ where: { id: { in: courseProducts.map(product => product.id) } }, select: { id: true } });
    const ids = new Set(existing.map(product => product.id));
    const missing = courseProducts.filter(product => !ids.has(product.id));
    if (missing.length) await tx.product.createMany({ data: missing });
    let updated = 0;
    for (const course of courseProducts) {
      if (!previousCourseNames[course.id]) continue;
      const result = await tx.product.updateMany({
        where: { id: course.id, category: "Cursos", name: previousCourseNames[course.id] },
        data: { name: course.name, description: course.description, mark: course.mark },
      });
      updated += result.count;
    }
    return { added: missing.length, updated };
  }, { timeout: 30000, maxWait: 10000 });
}

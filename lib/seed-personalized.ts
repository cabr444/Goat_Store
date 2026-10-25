import { db } from './db';
import { personalizedProducts } from './personalized-products';
export async function seedPersonalized() {
  // Stable IDs and skipDuplicates preserve administrator edits and stock on repeat runs.
  const result = await db.product.createMany({ data: personalizedProducts, skipDuplicates: true });
  return { added: result.count };
}

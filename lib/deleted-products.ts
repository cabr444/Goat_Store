import type { Prisma } from '@prisma/client';
export const deletedProductsKind = 'deleted-products';
export function deletedIdsFromRows(rows: { kind: string; ids: unknown }[]) {
  const value = rows.find(row => row.kind === deletedProductsKind)?.ids;
  return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string'))] : [];
}
export async function deletedProductIds(client: Pick<Prisma.TransactionClient, 'catalogOrder'>) {
  const row = await client.catalogOrder.findUnique({ where: { kind: deletedProductsKind }, select: { kind: true, ids: true } });
  return deletedIdsFromRows(row ? [row] : []);
}

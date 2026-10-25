import type { Prisma } from '@prisma/client';
import { db } from './db';
import { availableAccess } from './streaming-inventory';
export const accessForProduct = (productId: string): Prisma.StreamingAccessWhereInput => ({ OR: [{ productId }, { productIds: { has: productId } }] });
export const accessForProducts = (ids: string[]): Prisma.StreamingAccessWhereInput => ({ OR: [{ productId: { in: ids } }, { productIds: { hasSome: ids } }] });
export const accessProductIds = (row: { productId: string; productIds: string[] }) => [...new Set([row.productId, ...row.productIds])];
type InventoryDB = Pick<Prisma.TransactionClient, 'product' | 'streamingAccess'>;
export async function streamingStockCounts(client: InventoryDB, ids: string[]) {
  const counts = new Map(ids.map(id => [id, 0]));
  if (!ids.length) return counts;
  const rows = await client.streamingAccess.findMany({ where: { ...accessForProducts(ids), ...availableAccess }, select: { productId: true, productIds: true } });
  for (const row of rows) for (const id of accessProductIds(row)) if (counts.has(id)) counts.set(id, counts.get(id)! + 1);
  return counts;
}
export async function withStreamingStocks<T extends { id: string; category: string; stock: number }>(products: T[]): Promise<T[]> {
  const counts = await streamingStockCounts(db, products.filter(product => product.category === 'Streaming').map(product => product.id));
  return products.map(product => product.category === 'Streaming' ? { ...product, stock: counts.get(product.id) || 0 } : product);
}
export async function syncStreamingStocks(client: InventoryDB, ids: string[]) {
  const unique = [...new Set(ids)].sort();
  const counts = await streamingStockCounts(client, unique);
  for (const id of unique) await client.product.updateMany({ where: { id, category: 'Streaming' }, data: { stock: counts.get(id) || 0 } });
}

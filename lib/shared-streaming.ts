import { accountCategories, isAccountCategory } from "./account-categories";
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
// Streaming always uses unique accesses. Older music/productivity products keep
// their configured stock until an inventory row is explicitly added (including
// sold/retired rows so an exhausted pool can never fall back to legacy delivery).
export async function managedAccountProductIds(client: InventoryDB, products: { id: string; category: string }[]) {
  const eligible = products.filter(product => isAccountCategory(product.category));
  const ids = new Set(eligible.map(product => product.id));
  const managed = new Set(eligible.filter(product => product.category === 'Streaming').map(product => product.id));
  const optional = eligible.filter(product => product.category !== 'Streaming').map(product => product.id);
  const rows = optional.length ? await client.streamingAccess.findMany({ where: accessForProducts(optional), select: { productId: true, productIds: true } }) : [];
  for (const row of rows) for (const id of accessProductIds(row)) if (ids.has(id)) managed.add(id);
  return managed;
}
export async function withStreamingStocks<T extends { id: string; category: string; stock: number }>(products: T[]): Promise<T[]> {
  const managed = await managedAccountProductIds(db, products);
  const counts = await streamingStockCounts(db, [...managed]);
  return products.map(product => ({ ...product, inventoryManaged: managed.has(product.id), ...(managed.has(product.id) ? { stock: counts.get(product.id) || 0 } : {}) }));
}
export async function syncStreamingStocks(client: InventoryDB, ids: string[]) {
  const unique = [...new Set(ids)].sort();
  const counts = await streamingStockCounts(client, unique);
  for (const id of unique) await client.product.updateMany({ where: { id, category: { in: [...accountCategories] } }, data: { stock: counts.get(id) || 0 } });
}

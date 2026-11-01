import type { Prisma } from '@prisma/client';
import { accessForProduct, accessProductIds, syncStreamingStocks } from './shared-streaming';
import { availableAccess } from './streaming-inventory';
export async function removeProductInventory(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.streamingAccess.findMany({ where: { ...accessForProduct(id), ...availableAccess } });
  const affected = new Set([id]);
  for (const row of rows) {
    accessProductIds(row).forEach(id => affected.add(id));
    const remaining = accessProductIds(row).filter(productId => productId !== id);
    const changed = await tx.streamingAccess.updateMany({ where: { id: row.id, version: row.version, ...availableAccess }, data: remaining.length
      ? { productId: remaining[0], productIds: remaining.slice(1), version: { increment: 1 } }
      : { retiredAt: new Date(), version: { increment: 1 } } });
    if (changed.count !== 1) throw Error('El acceso cambió durante la operación.');
  }
  await syncStreamingStocks(tx, [...affected]);
}

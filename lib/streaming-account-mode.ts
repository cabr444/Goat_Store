import type { Prisma } from '@prisma/client';
import { deliverySchema, decryptPrivate, type Delivery } from './private-delivery';
import { accessFingerprint, availableAccess, normalizeAccessIdentity, platformForProduct } from './streaming-inventory';
import { accessProductIds } from './shared-streaming';
import { isFullAccount } from './streaming-product-kind';
export class AccountModeError extends Error {}
// Call inside a serializable transaction: a whole account and its profiles must
// never be registered concurrently as two independently saleable units.
export async function assertAccountMode(tx: Prisma.TransactionClient, platform: string, deliveries: Delivery[], full: boolean, editingId?: string) {
  const identifiers = new Set(deliveries.map(delivery => normalizeAccessIdentity(delivery.email)));
  const fingerprints = new Set(deliveries.map(delivery => accessFingerprint(platform, delivery)));
  const rows = await tx.streamingAccess.findMany({ where: { platform: platformForProduct(platform), ...availableAccess }, select: { id: true, productId: true, productIds: true, fingerprint: true, cipher: true } });
  const matching = rows.flatMap(row => {
    const delivery = deliverySchema.parse(JSON.parse(decryptPrivate(row.cipher)));
    return identifiers.has(normalizeAccessIdentity(delivery.email)) ? [{ ...row, delivery }] : [];
  });
  const products = matching.length ? await tx.product.findMany({ where: { id: { in: matching.flatMap(accessProductIds) } }, select: { id: true, name: true } }) : [];
  const fullPlans = new Set(products.filter(product => isFullAccount(product.name)).map(product => product.id));
  for (const row of matching) {
    if (row.id === editingId) continue;
    const existingFull = isFullAccount(row.delivery.profile) || accessProductIds(row).some(id => fullPlans.has(id));
    if ((full && (!existingFull || !fingerprints.has(row.fingerprint))) || (!full && existingFull))
      throw new AccountModeError('Esta cuenta ya está registrada como cuenta completa o por perfiles. No puede venderse de las dos maneras ni duplicarse con otro perfil.');
  }
}

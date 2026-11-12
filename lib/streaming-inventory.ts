import type { Prisma } from "@prisma/client";
import { createHmac } from "node:crypto";
import type { Delivery } from "./private-delivery";
import { normalizeAccessIdentity, platformForProduct } from "./streaming-platform";
export { normalizeAccessIdentity, platformForProduct } from "./streaming-platform";
export function accessFingerprint(platform: string, access: Pick<Delivery, "email" | "profile">) {
  const secret = process.env.DELIVERY_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw Error("Missing delivery encryption secret");
  return createHmac("sha256", secret).update(JSON.stringify([platformForProduct(platform), normalizeAccessIdentity(access.email), normalizeAccessIdentity(access.profile)])).digest("hex");
}
export const availableAccess = { soldAt: null, retiredAt: null };

// Keep historical rows (and their order links) intact while freeing the unique
// identity for a new inventory entry. Run inside the caller's transaction.
export async function releaseHistoricalAccess(tx: Prisma.TransactionClient, fingerprint: string) {
  const existing = await tx.streamingAccess.findUnique({ where: { fingerprint } });
  if (!existing || (!existing.soldAt && !existing.retiredAt)) return;
  await tx.streamingAccess.updateMany({
    where: { id: existing.id, fingerprint, version: existing.version, OR: [{ soldAt: { not: null } }, { retiredAt: { not: null } }] },
    data: { fingerprint: `history:${existing.id}:${fingerprint}`, version: { increment: 1 } },
  });
}

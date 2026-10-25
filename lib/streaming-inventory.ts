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

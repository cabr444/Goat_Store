import { createHmac } from "node:crypto";
import type { Delivery } from "./private-delivery";
export function normalizeAccessIdentity(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}
export function accessFingerprint(platform: string, access: Pick<Delivery, "email" | "profile">) {
  const secret = process.env.DELIVERY_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw Error("Missing delivery encryption secret");
  return createHmac("sha256", secret).update(JSON.stringify([platformForProduct(platform), normalizeAccessIdentity(access.email), normalizeAccessIdentity(access.profile)])).digest("hex");
}
export function platformForProduct(name: string) {
  const n = normalizeAccessIdentity(name);
  for (const [pattern, platform] of [[/netflix/,"netflix"],[/prime|amazon/,"prime"],[/disney/,"disney"],[/hbo|\bmax\b/,"max"],[/apple/,"apple"],[/paramount/,"paramount"],[/crunchyroll/,"crunchyroll"],[/youtube/,"youtube"],[/\bvix\b/,"vix"],[/plex/,"plex"],[/iptv/,"iptv"]] as const) if (pattern.test(n)) return platform;
  return n;
}
export const availableAccess = { soldAt: null, retiredAt: null };

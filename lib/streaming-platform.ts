export function normalizeAccessIdentity(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}
export function platformForProduct(name: string) {
  const n = normalizeAccessIdentity(name);
  for (const [pattern, platform] of [[/netflix/,"netflix"],[/prime|amazon/,"prime"],[/disney/,"disney"],[/hbo|\bmax\b/,"max"],[/apple/,"apple"],[/paramount/,"paramount"],[/crunchyroll/,"crunchyroll"],[/youtube/,"youtube"],[/\bvix\b/,"vix"],[/plex/,"plex"],[/iptv/,"iptv"]] as const) if (pattern.test(n)) return platform;
  return n;
}

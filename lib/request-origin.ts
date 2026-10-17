function httpOrigin(value: string | undefined | null): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch { return null; }
}

// APP_URL is the canonical address for email links. A browser may legitimately
// reach this same deployment through its production, branch or deployment URL.
export function allowedMutationOrigin(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (origin === null) return true; // Non-browser clients still need authentication.
  if (httpOrigin(origin) !== origin) return false; // Reject opaque or malformed origins.
  const allowed = new Set([httpOrigin(req.url), httpOrigin(process.env.APP_URL)]);
  if (process.env.VERCEL === "1") {
    for (const key of ["VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const) {
      const hostname = process.env[key]?.trim();
      if (hostname && /^[a-z0-9.-]+$/i.test(hostname)) allowed.add(httpOrigin(`https://${hostname}`));
    }
  }
  // No wildcard vercel.app allowlist and no trust in client forwarding headers.
  return allowed.has(origin);
}

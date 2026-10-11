import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";

const authLimits: Record<string, number> = {
  login: 20,
  register: 5,
  "forgot-password": 5,
  "reset-password": 20,
};

export function validateMutation(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = new URL(process.env.APP_URL || req.url).origin;
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== allowed)
  )
    return fail("Solicitud no autorizada.", 403);
  if (
    req.method !== "DELETE" &&
    !new URL(req.url).pathname.endsWith("/logout") &&
    req.headers.get("content-type")?.split(";")[0].trim() !== "application/json"
  )
    return fail("Envía datos JSON.", 415);
  const size = Number(req.headers.get("content-length") || 0);
  if (!Number.isFinite(size) || size > 16384)
    return fail("Solicitud demasiado grande.", 413);
  return null;
}

export async function consumeLimit(
  identity: string,
  limit: number,
  windowMs = 15 * 60000,
) {
  const now = Date.now();
  const bucket = Math.floor(now / windowMs);
  const digest = createHash("sha256").update(identity).digest("hex");
  await db.rateLimit.deleteMany({
    where: { expiresAt: { lt: new Date(now) } },
  });
  const entry = await db.rateLimit.upsert({
    where: { key: `${digest}:${bucket}` },
    create: {
      key: `${digest}:${bucket}`,
      count: 1,
      expiresAt: new Date((bucket + 1) * windowMs),
    },
    update: { count: { increment: 1 } },
  });
  return entry.count <= limit;
}

// Wrap mutations so new handlers share the same checks.
export function secureMutation<T extends unknown[]>(
  handler: (req: Request, ...args: T) => Promise<Response>,
) {
  return async (req: Request, ...args: T): Promise<Response> => {
    const denied = validateMutation(req);
    if (denied) return denied;
    try {
      // Bound the actual stream rather than trusting Content-Length.
      const reader = req.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader)
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 16384) {
            await reader.cancel();
            return fail("Solicitud demasiado grande.", 413);
          }
          chunks.push(value);
        }
      const body = Buffer.concat(chunks);
      const action = new URL(req.url).pathname.split("/").pop()!;
      if (authLimits[action]) {
        const data = JSON.parse(body.toString() || "{}");
        const account =
          typeof data.email === "string"
            ? data.email.trim().toLowerCase()
            : "token-reset";
        // Global ceiling also bounds attempts using arbitrary email addresses.
        if (
          !(await consumeLimit("auth-global", 1000)) ||
          !(await consumeLimit(`auth:${action}:${account}`, authLimits[action]))
        ) {
          const response = fail(
            "Demasiados intentos. Inténtalo en 15 minutos.",
            429,
          );
          response.headers.set("Retry-After", "900");
          return response;
        }
      }
      return await handler(
        new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: body.length ? body : undefined,
        }),
        ...args,
      );
    } catch (error) {
      if (error instanceof SyntaxError) return fail("Datos JSON inválidos.");
      console.error("Request processing failed");
      return fail("No fue posible procesar la solicitud.", 503);
    }
  };
}

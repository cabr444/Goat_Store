import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { POST } from "../app/api/auth/register/route";
import { tokenHash } from "../lib/password-reset";

const request = (role = "CLIENTE") => new Request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Test User", email: " USER@Example.com ", password: "test-password-123", role }) });
test("registration sends confirmation without creating or signing in a user, and rejects duplicates", async () => {
  const original = { limit: db.rateLimit.upsert, cleanup: db.rateLimit.deleteMany, find: db.user.findUnique, create: db.user.create, transaction: db.$transaction, pendingCleanup: db.pendingRegistration.deleteMany, fetch: globalThis.fetch };
  const saved = { APP_URL: process.env.APP_URL, RESEND_API_KEY: process.env.RESEND_API_KEY, EMAIL_FROM: process.env.EMAIL_FROM };
  let pending: any, mail: any, deleted = false;
  try {
    process.env.APP_URL = "http://localhost"; process.env.RESEND_API_KEY = "test-only"; process.env.EMAIL_FROM = "test@example.com";
    db.rateLimit.upsert = (async () => ({ count: 1 })) as any;
    db.rateLimit.deleteMany = (async () => ({ count: 0 })) as any;
    db.user.findUnique = (async ({ where }: any) => { assert.equal(where.email, "user@example.com"); return { id: "existing" }; }) as any;
    assert.equal((await POST(request())).status, 409);
    db.user.findUnique = (async () => null) as any;
    db.user.create = (async () => { assert.fail("A pending registration must not create User"); }) as any;
    db.$transaction = (async (callback: any) => callback({
      $queryRaw: async () => [], user: { findUnique: async () => null },
      pendingRegistration: { findUnique: async () => null, upsert: async ({ create }: any) => { pending = create; return create; } },
    })) as any;
    db.pendingRegistration.deleteMany = (async (args: any) => { if (args.where.tokenHash) deleted = true; return { count: 1 }; }) as any;
    globalThis.fetch = async (url, options) => { assert.equal(url, "https://api.resend.com/emails"); mail = JSON.parse(String(options?.body)); return new Response("{}", { status: 200 }); };
    const response = await POST(request());
    assert.equal(response.status, 202);
    assert.equal(response.headers.has("set-cookie"), false);
    const data = await response.json();
    assert.equal(data.pending, true); assert.match(data.ticket, /^[a-f0-9]{64}$/);
    assert.equal(pending.statusHash, tokenHash(data.ticket));
    assert.match(pending.passwordHash, /^\$2/); assert.notEqual(pending.passwordHash, "test-password-123");
    const rawToken = mail.text.match(/token=([a-f0-9]{64})/)[1];
    assert.equal(pending.tokenHash, tokenHash(rawToken));
    assert.notEqual(rawToken, data.ticket); assert.ok(!JSON.stringify(data).includes(rawToken));
    assert.deepEqual(mail.to, ["user@example.com"]); assert.ok(mail.text.includes("Confirmar correo y crear cuenta"));
    assert.equal((await POST(request("ADMIN"))).status, 400);
    globalThis.fetch = async () => new Response("{}", { status: 500 });
    assert.equal((await POST(request())).status, 503); assert.equal(deleted, true);
  } finally {
    db.rateLimit.upsert = original.limit; db.rateLimit.deleteMany = original.cleanup; db.user.findUnique = original.find; db.user.create = original.create; db.$transaction = original.transaction; db.pendingRegistration.deleteMany = original.pendingCleanup; globalThis.fetch = original.fetch;
    for (const [key, value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

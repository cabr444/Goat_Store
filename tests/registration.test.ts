import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { compare } from "bcryptjs";
import { db } from "../lib/db";
import { POST } from "../app/api/auth/register/route";
import { POST as verify } from "../app/api/auth/verify-email/route";
import { POST as resend } from "../app/api/auth/resend-verification/route";
const request = (role = "CLIENTE") => new Request("http://localhost/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Test User", email: " USER@Example.com ", password: "test-password-123", role }) });
test("registration immediately saves a hashed password without mail, preserves uniqueness and blocks admin signup", async () => {
  const original = { limit: db.rateLimit.upsert, cleanup: db.rateLimit.deleteMany, find: db.user.findUnique, create: db.user.create, fetch: globalThis.fetch };
  const saved = { RESEND_API_KEY: process.env.RESEND_API_KEY, EMAIL_FROM: process.env.EMAIL_FROM };
  let data: any;
  try {
    delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM;
    globalThis.fetch = async () => { assert.fail("Registration must not send an email"); };
    db.rateLimit.upsert = (async () => ({ count: 1 })) as any;
    db.rateLimit.deleteMany = (async () => ({ count: 0 })) as any;
    db.user.findUnique = (async ({ where }: any) => { assert.equal(where.email, "user@example.com"); return null; }) as any;
    db.user.create = (async (args: any) => { data = args.data; return { id: "new-user" }; }) as any;
    const response = await POST(request());
    assert.equal(response.status, 201); assert.equal(response.headers.has("set-cookie"), false);
    const body = await response.json(); assert.equal(body.pending, undefined); assert.equal(body.ticket, undefined); assert.match(body.message, /Cuenta creada/);
    assert.equal(data.email, "user@example.com"); assert.equal(data.role, "CLIENTE");
    assert.ok(await compare("test-password-123", data.passwordHash)); assert.ok(!JSON.stringify(body).includes(data.passwordHash));
    assert.equal((await POST(request("VENDEDOR"))).status,201); assert.equal(data.role,"VENDEDOR");
    assert.equal((await POST(request("ADMIN"))).status,400);
    db.user.findUnique = (async () => ({ id: "existing" })) as any;
    assert.equal((await POST(request())).status,409);
    db.user.findUnique = (async () => null) as any;
    db.user.create = (async () => { throw new Prisma.PrismaClientKnownRequestError("Fixture duplicate", { code: "P2002", clientVersion: "6.19.3" }); }) as any;
    assert.equal((await POST(request())).status,409);
    assert.equal((await verify()).status,410); assert.equal((await resend()).status,410);
  } finally {
    db.rateLimit.upsert=original.limit; db.rateLimit.deleteMany=original.cleanup; db.user.findUnique=original.find; db.user.create=original.create; globalThis.fetch=original.fetch;
    for(const [key,value] of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
});

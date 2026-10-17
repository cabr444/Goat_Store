import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid"), base = new URL(process.env.INVENTORY_TEST_URL || "http://127.0.0.1:3103");
if (!["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/goat_inventory_test" || !["localhost", "127.0.0.1"].includes(base.hostname) || !process.env.VERIFICATION_EMAIL_CAPTURE) throw Error("Use an isolated local goat_inventory_test database, local app and intercepted email capture file.");
const db = new PrismaClient(), suffix = randomUUID(), emails = [], password = "local-verification-password-123";
const digest = value => createHash("sha256").update(value).digest("hex");
async function request(path, body, origin = base.origin) {
  const response = await fetch(base.origin + path, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body), redirect: "manual" });
  return { response, data: await response.json() };
}
async function signup(prefix, role = "CLIENTE") {
  const email = prefix + suffix + "@example.com"; emails.push(email);
  const result = await request("/api/auth/register", { email: " " + email.toUpperCase() + " ", name: "Verification Fixture", role, password });
  return { email, ...result };
}
async function token(email) {
  const lines = (await readFile(process.env.VERIFICATION_EMAIL_CAPTURE, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const mail = lines.filter(mail => mail.to.includes(email)).at(-1);
  assert.ok(mail); return mail.text.match(/token=([a-f0-9]{64})/)[1];
}
try {
  const first = await signup("verify-"); assert.equal(first.response.status, 202); assert.equal(first.response.headers.has("set-cookie"), false);
  assert.equal(await db.user.count({ where: { email: first.email } }), 0);
  let pending = await db.pendingRegistration.findUniqueOrThrow({ where: { email: first.email } });
  const firstToken = await token(first.email);
  assert.equal(pending.tokenHash, digest(firstToken)); assert.equal(pending.statusHash, digest(first.data.ticket));
  assert.notEqual(firstToken, first.data.ticket); assert.ok(await compare(password, pending.passwordHash));
  assert.ok(!JSON.stringify(first.data).includes(firstToken));
  assert.equal((await request("/api/auth/login", { email: first.email, password })).response.status, 401);
  assert.equal((await request("/api/auth/registration-status", { ticket: first.data.ticket })).data.status, "pending");
  assert.equal((await fetch(base.origin + "/confirmar-correo?token=" + firstToken)).status, 200);
  assert.equal(await db.user.count({ where: { email: first.email } }), 0, "Email scanner GET must not create an account");
  assert.equal((await request("/api/auth/register", { email: first.email, password, name: "Duplicate", role: "CLIENTE" })).response.status, 429);
  const concurrent = await Promise.all([request("/api/auth/verify-email", { token: firstToken }), request("/api/auth/verify-email", { token: firstToken })]);
  assert.deepEqual(concurrent.map(item => item.response.status).sort(), [201, 400]);
  assert.equal(await db.user.count({ where: { email: first.email } }), 1);
  pending = await db.pendingRegistration.findUniqueOrThrow({ where: { email: first.email } });
  assert.ok(pending.confirmedAt); assert.equal(pending.passwordHash, "");
  assert.equal((await request("/api/auth/registration-status", { ticket: first.data.ticket })).data.status, "confirmed");
  assert.equal((await request("/api/auth/verify-email", { token: firstToken })).response.status, 400);
  const login = await request("/api/auth/login", { email: first.email, password }); assert.equal(login.response.status, 200); assert.ok(login.response.headers.has("set-cookie"));
  assert.equal((await request("/api/auth/register", { email: first.email.toUpperCase(), password, name: "Duplicate", role: "CLIENTE" })).response.status, 409);
  const expired = await signup("expired-", "VENDEDOR"), expiredToken = await token(expired.email);
  await db.pendingRegistration.update({ where: { email: expired.email }, data: { expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 65000) } });
  assert.equal((await request("/api/auth/verify-email", { token: expiredToken })).response.status, 400);
  assert.equal(await db.user.count({ where: { email: expired.email } }), 0);
  assert.equal((await request("/api/auth/registration-status", { ticket: expired.data.ticket })).data.status, "expired");
  assert.equal((await request("/api/auth/resend-verification", { ticket: expired.data.ticket })).response.status, 202);
  const resentToken = await token(expired.email); assert.notEqual(resentToken, expiredToken);
  assert.equal((await request("/api/auth/verify-email", { token: expiredToken })).response.status, 400);
  assert.equal((await request("/api/auth/verify-email", { token: resentToken })).response.status, 201);
  assert.equal((await db.user.findUniqueOrThrow({ where: { email: expired.email } })).role, "VENDEDOR");
  const concurrentEmail = "concurrent-" + suffix + "@example.com"; emails.push(concurrentEmail);
  const registrationAttempts = await Promise.all([1, 2].map(() => request("/api/auth/register", { email: concurrentEmail, password, name: "Concurrent Fixture", role: "CLIENTE" })));
  assert.deepEqual(registrationAttempts.map(item => item.response.status).sort(), [202, 429]);
  assert.equal(await db.user.count({ where: { email: concurrentEmail } }), 0);
  assert.equal(await db.pendingRegistration.count({ where: { email: concurrentEmail } }), 1);
  assert.equal((await request("/api/auth/verify-email", { token: await token(concurrentEmail) })).response.status, 201);
  const failed = await signup("fail-"); assert.equal(failed.response.status, 503);
  assert.equal(await db.user.count({ where: { email: failed.email } }), 0); assert.equal(await db.pendingRegistration.count({ where: { email: failed.email } }), 0);
  const retryFailed = await signup("retry-fail-"), validToken = await token(retryFailed.email);
  await db.pendingRegistration.update({ where: { email: retryFailed.email }, data: { createdAt: new Date(Date.now() - 65000) } });
  assert.equal((await request("/api/auth/resend-verification", { ticket: retryFailed.data.ticket })).response.status, 503);
  assert.equal((await request("/api/auth/verify-email", { token: validToken })).response.status, 201, "Failed resend keeps the previously delivered link usable");
  assert.equal((await request("/api/auth/verify-email", { token: "0".repeat(64) })).response.status, 400);
  assert.equal((await request("/api/auth/register", { email: "admin-test@example.com", name: "Invalid Admin", role: "ADMIN", password })).response.status, 400);
  assert.equal((await request("/api/auth/verify-email", { token: firstToken }, "https://other.example")).response.status, 403);
  console.log("Email verification passed: no account/session before confirmation, hash-only tokens, scan-safe GET, login blocked pending, single-use concurrent confirmation, duplicate uniqueness, expiry, resend/cooldown, delivery rollback, vendor role and origin protection.");
} finally {
  await db.pendingRegistration.deleteMany({ where: { email: { in: emails } } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
}

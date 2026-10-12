import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
const base = new URL(process.env.INVENTORY_TEST_URL || "http://127.0.0.1:3103");
if (!["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/goat_inventory_test" || !["localhost", "127.0.0.1"].includes(base.hostname)) throw Error("Use an isolated local goat_inventory_test database and local server only.");
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw Error("Set the same local test AUTH_SECRET as the server.");
const db = new PrismaClient(), users = [], products = [], suffix = randomUUID();
const previous = await db.catalogOrder.findMany();
async function request(path, token, method = "GET", body) {
  const response = await fetch(base.origin + path, { method, headers: { Cookie: "goat_session=" + token, Origin: base.origin, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
try {
  for (const role of ["ADMIN", "CLIENTE", "VENDEDOR"]) users.push(await db.user.create({ data: { name: role + " ordering fixture", email: role + suffix + "@example.com", role, passwordHash: "fake" } }));
  const [admin, client, seller] = await Promise.all(users.map(u => new SignJWT({ uid: u.id, sv: 0 }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET))));
  for (const name of ["First ordering fixture", "Second ordering fixture"]) products.push(await db.product.create({ data: { name, category: "Streaming", price: 1000, stock: 0 } }));
  for (const [kind, id, target] of [["products", products[1].id, products[0].id], ["categories", "Combos", "Streaming"]]) {
    const original = (await request("/api/storefront", admin)).data.cardOrders[kind];
    const body = { kind, id, target, position: "before", version: original.version };
    for (const unauthorized of [client, seller]) assert.equal((await request("/api/admin/card-order", unauthorized, "PUT", body)).status, 403);
    const result = await request("/api/admin/card-order", admin, "PUT", body);
    assert.equal(result.status, 200);
    assert.ok(result.data.order.ids.indexOf(id) < result.data.order.ids.indexOf(target));
    for (const path of ["/api/storefront", "/api/products"]) assert.deepEqual((await request(path, client)).data.cardOrders[kind], result.data.order);
    assert.equal((await request("/api/admin/card-order", admin, "PUT", body)).status, 409);
    assert.deepEqual((await request("/api/storefront", client)).data.cardOrders[kind], result.data.order);
    assert.equal((await request("/api/admin/card-order", admin, "PUT", { ...body, id: "missing", version: result.data.order.version })).status, 404);
  }
  console.log("Card ordering passed: administrator-only changes, persistent shared product/category order, stale-write rejection and missing-card validation.");
} finally {
  await db.catalogOrder.deleteMany();
  for (const row of previous) await db.catalogOrder.create({ data: row });
  await db.product.deleteMany({ where: { id: { in: products.map(product => product.id) } } });
  await db.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
  await db.$disconnect();
}

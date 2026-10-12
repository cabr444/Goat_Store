import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
const base = new URL(process.env.INVENTORY_TEST_URL || "http://127.0.0.1:3103");
if (!["localhost", "127.0.0.1"].includes(database.hostname) || database.pathname !== "/goat_inventory_test" || !["localhost", "127.0.0.1"].includes(base.hostname)) throw Error("Use the isolated local goat_inventory_test database and local app only.");
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw Error("Configure the same test AUTH_SECRET as the local server.");
const db = new PrismaClient(), users = [], products = [], suffix = randomUUID();
const previous = await db.storeSettings.findUnique({ where: { id: "main" } });
async function token(id) { return new SignJWT({ uid: id, sv: 0 }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode(process.env.AUTH_SECRET)); }
async function request(path, cookie, method = "GET", body) {
  const response = await fetch(base.origin + path, { method, headers: { Cookie: "goat_session=" + cookie, Origin: base.origin, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  return { response, data: response.headers.get("content-type")?.includes("application/json") ? await response.json() : null };
}
try {
  for (const role of ["ADMIN", "CLIENTE", "VENDEDOR"]) users.push(await db.user.create({ data: { name: "Section test " + role, email: role + suffix + "@example.com", passwordHash: "fake", role, balance: 100000 } }));
  const [admin, client, seller] = await Promise.all(users.map(user => token(user.id)));
  assert.equal((await request("/api/admin/store-options", client)).response.status, 403);
  assert.equal((await request("/api/admin/store-options", seller, "PUT", { department: "tienda", enabled: false })).response.status, 403);
  for (const [department, category, path, field] of [["tienda", "Audio", "/store", "tiendaEnabled"], ["segunda", "Tecnología usada", "/segunda", "segundaEnabled"]]) {
    await request("/api/admin/store-options", admin, "PUT", { department, enabled: true });
    const product = await db.product.create({ data: { name: "Section fixture " + department, category, stock: 2, price: 1000 } }); products.push(product.id);
    const purchase = await request("/api/orders", client, "POST", { items: [{ id: product.id, qty: 1 }] });
    assert.equal(purchase.response.status, 201);
    assert.equal((await request("/api/admin/store-options", admin, "PUT", { department, enabled: false })).response.status, 200);
    assert.equal((await request("/api/admin/store-options", admin)).data.storeOptions[field], false);
    assert.equal((await request(path, client)).response.status, 307);
    assert.equal((await request(path, admin)).response.status, 200);
    assert.equal((await request(path, seller)).response.status, 200);
    for (const api of ["/api/products", "/api/storefront"]) {
      const catalog = await request(api, client); assert.ok(!catalog.data.products.some(item => item.id === product.id));
      const adminCatalog = await request(api, admin); assert.ok(adminCatalog.data.products.some(item => item.id === product.id));
    }
    const balance = (await db.user.findUnique({ where: { id: users[1].id } })).balance;
    const blocked = await request("/api/orders", client, "POST", { items: [{ id: product.id, qty: 1 }] });
    assert.equal(blocked.response.status, 400);
    assert.match(blocked.data.error, /deshabilitada/);
    assert.equal((await db.user.findUnique({ where: { id: users[1].id } })).balance, balance);
    assert.equal((await db.product.findUnique({ where: { id: product.id } })).stock, 1);
    assert.ok((await request("/api/orders", client)).data.orders.some(order => order.id === purchase.data.orderId));
    assert.equal((await request("/api/admin/store-options", admin, "PUT", { department, enabled: true })).data.storeOptions[field], true);
    assert.ok((await request("/api/products", client)).data.products.some(item => item.id === product.id));
    assert.equal((await request(path, client)).response.status, 200);
  }
  console.log("Section switches passed: admin-only save, persistence, independent departments, client route/catalog/purchase restrictions, no debit or stock change, old orders preserved and admin/seller access retained.");
} finally {
  if (previous) await db.storeSettings.upsert({ where: { id: "main" }, create: previous, update: previous }); else await db.storeSettings.deleteMany({ where: { id: "main" } });
  const ids = users.map(user => user.id);
  await db.orderItem.deleteMany({ where: { order: { userId: { in: ids } } } });
  await db.order.deleteMany({ where: { userId: { in: ids } } });
  await db.walletEvent.deleteMany({ where: { userId: { in: ids } } });
  await db.product.deleteMany({ where: { id: { in: products } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}

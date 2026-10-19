import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { accessFingerprint } from "../lib/streaming-inventory.ts";
import { encryptPrivate, decryptPrivate } from "../lib/private-delivery.ts";
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
const base = new URL(process.env.INVENTORY_TEST_URL || "http://127.0.0.1:3103");
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  database.pathname !== "/goat_inventory_test" ||
  !["localhost", "127.0.0.1"].includes(base.hostname)
)
  throw Error(
    "Use only an isolated local database named goat_inventory_test and a local test server.",
  );
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)
  throw Error("Configure the same test AUTH_SECRET as the local server.");
const db = new PrismaClient(),
  suffix = randomUUID(),
  users = [],
  products = [];

const url = base.origin;
const access = {
  brand: "STREAMING LT",
  email: "delivery-fixture@example.com",
  password: "FixtureAccessOriginal",
  profile: "1",
  pin: "3311",
};
async function token(id) {
  return new SignJWT({ uid: id, sv: 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
}
async function request(path, cookie, method = "GET", body) {
  const response = await fetch(url + path, {
    method,
    headers: {
      Cookie: "goat_session=" + cookie,
      Origin: url,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  return { response, data: await response.json() };
}
(async () => {
  const admin = await db.user.create({
    data: {
      name: "Test Admin",
      email: "admin-fixture-" + suffix + "@example.com",
      passwordHash: "test-only",
      role: "ADMIN",
    },
  });
  const buyer1 = await db.user.create({
    data: {
      name: "Test Buyer One",
      email: "buyer-one-fixture-" + suffix + "@example.com",
      passwordHash: "test-only",
      balance: 100000,
    },
  });
  const buyer2 = await db.user.create({
    data: {
      name: "Test Buyer Two",
      email: "buyer-two-fixture-" + suffix + "@example.com",
      passwordHash: "test-only",
      balance: 100000,
    },
  });
  users.push(admin.id, buyer1.id, buyer2.id);
  const ownUsers = { userId: { in: users } };
  const a = await token(admin.id),
    b1 = await token(buyer1.id),
    b2 = await token(buyer2.id);
  const product = await db.product.create({
    data: {
      name: "Netflix x33 días",
      category: "Streaming",
      price: 14000,
      stock: 1,
      deliveryCipher: encryptPrivate(JSON.stringify(access)),
    },
  });
  const empty = await db.product.create({
    data: {
      name: "Empty stock fixture",
      category: "Audio",
      price: 5000,
      stock: 0,
      active: false,
    },
  });
  const unconfigured = await db.product.create({
    data: {
      name: "Unconfigured stream fixture",
      category: "Streaming",
      price: 4000,
      stock: 2,
    },
  });
  products.push(product.id, empty.id, unconfigured.id);
  await db.streamingAccess.create({ data: { productId: product.id, platform: "netflix", fingerprint: accessFingerprint("netflix", access), cipher: encryptPrivate(JSON.stringify(access)) } });
  const bootstrap = await request("/api/storefront", b1);
  assert.equal(bootstrap.response.status, 200);
  assert.equal(bootstrap.data.user.id, buyer1.id);
  assert.deepEqual(bootstrap.data.users, []);
  assert.ok(bootstrap.data.products.some(p => p.id === product.id));
  assert.ok(!JSON.stringify(bootstrap.data).includes("deliveryCipher"));
  assert.ok(!JSON.stringify(bootstrap.data).includes(access.email));
  assert.ok((await request("/api/storefront", a)).data.users.some(u => u.id === buyer1.id));
  assert.equal((await request("/api/storefront", "")).response.status, 200);
  const catalog = await request("/api/products", b1);
  assert.equal(catalog.response.status, 200);
  assert.ok(
    catalog.data.products.some((p) => p.id === empty.id && p.stock === 0),
  );
  assert.ok(!JSON.stringify(catalog.data).includes("deliveryCipher"));
  assert.ok(!JSON.stringify(catalog.data).includes(access.email));
  assert.equal(
    (await request("/api/admin/products/" + product.id + "/delivery", b1))
      .response.status,
    403,
  );
  const adminAccess = await request(
    "/api/admin/products/" + product.id + "/delivery",
    a,
  );
  assert.equal(adminAccess.data.delivery.password, access.password);
  const attempts = await Promise.all([
    request("/api/orders", b1, "POST", { items: [{ id: product.id, qty: 1 }] }),
    request("/api/orders", b2, "POST", { items: [{ id: product.id, qty: 1 }] }),
  ]);
  assert.deepEqual(attempts.map((x) => x.response.status).sort(), [201, 400]);
  const staleEdit = await request("/api/products/" + product.id, a, "PATCH", {
    name: product.name,
    category: product.category,
    price: product.price,
    stock: 1,
    expectedStock: 1,
  });
  assert.equal(staleEdit.response.status, 409);
  const stock = await db.product.findUniqueOrThrow({
    where: { id: product.id },
  });
  assert.equal(stock.stock, 0);
  assert.equal(await db.order.count({ where: ownUsers }), 1);
  const balances = await db.user.findMany({
    where: { id: { in: [buyer1.id, buyer2.id] } },
    select: { balance: true },
  });
  assert.equal(
    balances.reduce((sum, u) => sum + u.balance, 0),
    186000,
  );
  assert.equal(
    await db.walletEvent.count({ where: { ...ownUsers, type: "COMPRA" } }),
    1,
  );
  const order = await db.order.findFirstOrThrow({
    where: ownUsers,
    include: { items: true },
  });
  assert.equal(order.status, "ENTREGADO");
  assert.match(order.reference, /^P[1-9][0-9]*$/);
  assert.ok(
    order.items[0].receiptCipher &&
      !order.items[0].receiptCipher.includes(access.password),
  );
  const receipt = decryptPrivate(order.items[0].receiptCipher);
  for (const value of [
    access.email,
    access.password,
    "Perfil: 1",
    "Pin: 3311",
    order.reference,
    "Fecha de compra:",
  ])
    assert.ok(receipt.includes(value));
  const winner = order.userId === buyer1.id ? b1 : b2,
    other = order.userId === buyer1.id ? b2 : b1;
  const ownPage = await fetch(url + "/pedidos?pedido=" + order.id + "&comprobante=1", {
    headers: { Cookie: "goat_session=" + winner },
  });
  const ownHtml = await ownPage.text();
  assert.equal(ownPage.status, 200);
  assert.ok(ownHtml.includes("receipt-modal"));
  assert.ok(ownHtml.includes("<strong>👑 STREAMING LT👑</strong>"));
  assert.ok(ownHtml.includes(access.email));
  assert.ok(ownHtml.includes(access.password));
  const otherHtml = await (
    await fetch(url + "/pedidos?pedido=" + order.id, {
      headers: { Cookie: "goat_session=" + other },
    })
  ).text();
  assert.ok(!otherHtml.includes(access.email));
  assert.ok(!otherHtml.includes(access.password));
  assert.equal(
    (
      await request("/api/orders", b1, "POST", {
        items: [{ id: empty.id, qty: 1 }],
      })
    ).response.status,
    400,
  );
  assert.equal(
    (
      await request("/api/orders", b1, "POST", {
        items: [{ id: unconfigured.id, qty: 1 }],
      })
    ).response.status,
    400,
  );
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: unconfigured.id } }))
      .stock,
    2,
  );
  assert.equal(await db.order.count({ where: ownUsers }), 1);
  assert.equal(
    (
      await request(
        "/api/admin/products/" + product.id + "/inventory",
        a,
        "POST",
        { platform: "netflix", delivery: { ...access, profile: "2", password: "FixtureAccessUpdated" } },
      )
    ).response.status,
    201,
  );
  const oldReceipt = decryptPrivate(
    (await db.orderItem.findFirstOrThrow({ where: { order: ownUsers } }))
      .receiptCipher,
  );
  assert.ok(oldReceipt.includes(access.password));
  assert.ok(!oldReceipt.includes("FixtureAccessUpdated"));
  const priceEdit = await request("/api/products/" + product.id, a, "PATCH", {
    name: product.name, category: product.category, price: 17000, stock: 999, expectedStock: 1,
  });
  assert.equal(priceEdit.response.status, 200);
  assert.equal(priceEdit.data.product.price, 17000);
  const secondPurchase = await request("/api/orders", winner, "POST", { items: [{ id: product.id, qty: 1 }] });
  assert.equal(secondPurchase.response.status, 201);
  assert.equal(secondPurchase.data.total, 17000);
  assert.equal(secondPurchase.data.reference, "P" + (Number(order.reference.slice(1)) + 1));
  assert.equal((await db.order.findUniqueOrThrow({where: {id: order.id}})).total, 14000);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFOkAAAAASUVORK5CYII=",
    "base64",
  );
  const imagePath = "/api/admin/images?kind=product&key=" + product.id;
  const forbiddenImage = await fetch(url + imagePath, {
    method: "POST",
    headers: {
      Cookie: "goat_session=" + b1,
      Origin: url,
      "Content-Type": "image/png",
    },
    body: png,
  });
  assert.equal(forbiddenImage.status, 403);
  const image = await fetch(url + imagePath, {
    method: "POST",
    headers: {
      Cookie: "goat_session=" + a,
      Origin: url,
      "Content-Type": "image/png",
    },
    body: png,
  });
  assert.equal(image.status, 200);
  const loaded = await fetch(
    url +
      "/api/catalog-images/file?key=" +
      encodeURIComponent("product:" + product.id),
    { headers: { Cookie: "goat_session=" + b1 } },
  );
  assert.deepEqual(Buffer.from(await loaded.arrayBuffer()), png);
  const etag = loaded.headers.get("etag");
  assert.ok(etag);
  const cachedImageUrl = url + "/api/catalog-images/file?key=" + encodeURIComponent("product:" + product.id);
  const cached = await fetch(cachedImageUrl, {headers: {Cookie: "goat_session=" + b1, "If-None-Match": etag}});
  assert.equal(cached.status, 304);
  assert.equal((await cached.arrayBuffer()).byteLength, 0);
  assert.equal((await fetch(cachedImageUrl, {headers: {"If-None-Match": etag}})).status, 304);
  const metadata = await request("/api/catalog-images", b1);
  assert.ok(
    metadata.data.images.some((i) => i.key === "product:" + product.id),
  );
  console.log(
    "Real PostgreSQL integration passed: one last-stock purchase, one debit/order, zero-stock visibility, missing-access rollback, encrypted frozen receipt, buyer-only receipt access, admin-only credentials/images and persisted uploads.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.catalogImageAsset.deleteMany({
        where: { key: { in: products.map((id) => "product:" + id) } },
      });
      await db.walletEvent.deleteMany({ where: { userId: { in: users } } });
      await db.streamingAccess.deleteMany({ where: { productId: { in: products } } });
      await db.orderItem.deleteMany({
        where: { order: { userId: { in: users } } },
      });
      await db.order.deleteMany({ where: { userId: { in: users } } });
      await db.product.deleteMany({ where: { id: { in: products } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
    } finally {
      await db.$disconnect();
    }
  });

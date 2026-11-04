import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
const base = new URL(process.env.INVENTORY_TEST_URL || 'http://127.0.0.1:3140');
if (database.hostname !== '127.0.0.1' || database.pathname !== '/goat_inventory_test' || base.hostname !== '127.0.0.1') throw Error('Disposable local database/server required');
const db = new PrismaClient(), users = [], products = [], suffix = randomUUID();
async function buy(user, items, checkoutKey = randomUUID(), extra = {}) { return fetch(base.origin + '/api/orders', { method: 'POST', headers: { Cookie: 'goat_session=' + user.token, Origin: base.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ items, checkoutKey, ...extra }) }); }
try {
  for (const role of ['ADMIN', 'CLIENTE', 'VENDEDOR']) {
    const user = await db.user.create({ data: { name: 'Checkout ' + role, email: `admin-buy-${role}-${suffix}@example.com`, role, balance: 0, passwordHash: 'fixture' } });
    users.push({ ...user, token: await new SignJWT({ uid: user.id, sv: 0 }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET)) });
  }
  const [admin, client, seller] = users;
  for (const stock of [10, 0]) products.push(await db.product.create({ data: { name: 'Admin purchase fixture ' + stock, category: 'Cursos', price: 5000, stock, active: true } }));
  const [product, soldOut] = products, key = randomUUID(), items = [{ id: product.id, qty: 2 }];
  const first = await buy(admin, items, key); assert.equal(first.status, 201, await first.clone().text());
  const orderId = (await first.json()).orderId;
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: orderId } })).total, 10000);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: admin.id } })).balance, 0);
  assert.equal(await db.walletEvent.count({ where: { userId: admin.id } }), 0);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 8);
  assert.equal((await buy(admin, items, key)).status, 200);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 8);
  assert.equal(await db.order.count({ where: { userId: admin.id } }), 1);
  assert.equal((await buy(admin, [{ id: soldOut.id, qty: 1 }])).status, 400);
  for (const user of [client, seller]) {
    const denied = await buy(user, items, randomUUID(), { role: 'ADMIN' });
    assert.equal(denied.status, 400); assert.ok((await denied.json()).error.includes('Saldo insuficiente'));
    assert.equal(await db.order.count({ where: { userId: user.id } }), 0);
  }
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock, 8);
  await db.user.update({ where: { id: client.id }, data: { balance: 20000 } });
  assert.equal((await buy(client, items)).status, 201);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: client.id } })).balance, 10000);
  assert.equal((await db.walletEvent.findFirstOrThrow({ where: { userId: client.id, type: 'COMPRA' } })).amount, -10000);
  console.log('PASS: admin zero-balance purchase, no wallet debit/event, stock consumed once, replay idempotency, sold-out rejection, client/seller balance enforced, paid client debited normally.');
} finally {
  const ids = users.map(user => user.id), orders = await db.order.findMany({ where: { userId: { in: ids } }, select: { id: true } });
  await db.checkoutAttempt.deleteMany({ where: { orderId: { in: orders.map(order => order.id) } } });
  await db.orderItem.deleteMany({ where: { orderId: { in: orders.map(order => order.id) } } });
  await db.order.deleteMany({ where: { userId: { in: ids } } });
  await db.walletEvent.deleteMany({ where: { userId: { in: ids } } });
  await db.product.deleteMany({ where: { id: { in: products.map(product => product.id) } } });
  await db.user.deleteMany({ where: { id: { in: ids } } }); await db.$disconnect();
}

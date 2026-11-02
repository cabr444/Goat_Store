import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
const base = new URL(process.env.INVENTORY_TEST_URL || 'http://127.0.0.1:3140');
if (database.hostname !== '127.0.0.1' || database.pathname !== '/goat_inventory_test' || base.hostname !== '127.0.0.1') throw Error('Disposable local database/server required');
const db = new PrismaClient(), users = [], suffix = randomUUID();
async function request(path, token = '', method = 'GET', body) {
  return fetch(base.origin + path, { method, headers: { Cookie: 'goat_session=' + token, Origin: base.origin, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
}
try {
  for (const role of ['ADMIN', 'CLIENTE', 'VENDEDOR']) {
    const user = await db.user.create({ data: { name: 'Recharge ' + role, email: `recharge-${role}-${suffix}@example.com`, passwordHash: 'fixture', role } });
    users.push({ ...user, token: await new SignJWT({ uid: user.id, sv: 0 }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET)) });
  }
  const [admin, client, seller] = users, endpoint = '/api/account/recharges';
  assert.equal((await request(endpoint)).status, 401);
  assert.equal((await request(endpoint, 'invalid')).status, 401);
  assert.deepEqual((await (await request(endpoint, client.token)).json()).items, []);
  assert.equal((await request('/api/admin/recharge', client.token, 'POST', { userId: client.id, amount: 5000 })).status, 403);
  assert.equal((await request('/api/admin/recharge', admin.token, 'POST', { userId: client.id, amount: 12000, note: 'Private admin note' })).status, 200);
  const response = await request(endpoint, client.token), data = await response.json();
  assert.equal(response.status, 200); assert.ok(response.headers.get('cache-control').includes('no-store'));
  assert.equal(data.userId, client.id); assert.equal(data.items.length, 1); assert.equal(data.items[0].amount, 12000);
  assert.deepEqual(Object.keys(data.items[0]).sort(), ['amount', 'createdAt', 'id']);
  assert.equal(await db.walletEvent.count({ where: { userId: client.id, type: 'RECARGA' } }), 1);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: client.id } })).balance, 12000);
  assert.deepEqual((await (await request(endpoint, seller.token)).json()).items, []);
  const rechargeId = data.items[0].id;
  assert.equal((await request(endpoint, '', 'POST', { ids: [rechargeId] })).status, 401);
  assert.equal((await request(endpoint, client.token, 'POST', { ids: [rechargeId], userId: seller.id })).status, 400);
  assert.equal((await request(endpoint, seller.token, 'POST', { ids: [rechargeId] })).status, 200);
  assert.deepEqual((await (await request(endpoint, seller.token)).json()).read, []);
  assert.equal((await request(endpoint, client.token, 'POST', { ids: [rechargeId] })).status, 200);
  assert.deepEqual((await (await request(endpoint, client.token)).json()).read, [rechargeId]);
  const signedAgain = await new SignJWT({ uid: client.id, sv: 0 }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  assert.deepEqual((await (await request(endpoint, signedAgain)).json()).read, [rechargeId]);

  assert.ok(!JSON.stringify(data).includes('Private admin note')); assert.ok(!JSON.stringify(data).includes(admin.id));
  await db.walletEvent.createMany({ data: [
    { userId: client.id, amount: -500, type: 'COMPRA', note: 'not a top up' },
    { userId: client.id, amount: -100, type: 'RECARGA', note: 'not a positive top up' },
    ...Array.from({ length: 25 }, (_, i) => ({ userId: client.id, amount: i + 1, type: 'RECARGA', note: 'fixture', createdAt: new Date(Date.now() + i * 1000) })),
  ] });
  const recent = (await (await request(endpoint + '?userId=' + seller.id, client.token)).json()).items;
  assert.equal(recent.length, 20); assert.equal(recent[0].amount, 25); assert.equal(recent.at(-1).amount, 6);
  const [firstRead, secondRead] = await Promise.all([request(endpoint, client.token, 'POST', { ids: [recent[0].id] }), request(endpoint, client.token, 'POST', { ids: [recent[1].id] })]);
  assert.equal(firstRead.status, 200); assert.equal(secondRead.status, 200);
  const persisted = (await (await request(endpoint, client.token)).json()).read;
  for (const id of [rechargeId, recent[0].id, recent[1].id]) assert.ok(persisted.includes(id));

  const before = await db.walletEvent.count(); await request(endpoint, client.token); assert.equal(await db.walletEvent.count(), before);
  console.log('PASS: authenticated own-account notifications, atomic real top-up record, no private notes, no cross-account access, newest 20 positive recharges, read-only polling.');
} finally {
  await db.catalogOrder.deleteMany({ where: { kind: { in: users.map(user => 'recharge-notifications-read:' + user.id) } } });
  await db.walletEvent.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
  await db.user.deleteMany({ where: { id: { in: users.map(user => user.id) } } });
  await db.$disconnect();
}

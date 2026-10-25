import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readJsonResponse } from '../lib/json-response';
import { catalogFailure } from '../lib/catalog-failure';
import { Prisma } from '@prisma/client';
test('empty and HTML responses do not become successful authentication or expose server content', async () => {
  for (const status of [200, 500, 502, 504]) {
    await assert.rejects(readJsonResponse(new Response('', { status })), /El servidor no respondió correctamente/);
    await assert.rejects(readJsonResponse(new Response('<html>private server error</html>', { status })), /El servidor no respondió correctamente/);
  }
  for (const value of ['null', '[]', 'true']) await assert.rejects(readJsonResponse(new Response(value)), /El servidor/);
  assert.deepEqual(await readJsonResponse(new Response('{"ok":true}')), {ok:true});
  await assert.rejects(readJsonResponse(new Response('{"error":"Correo o contraseña incorrectos."}', {status:401})), /Correo o contraseña incorrectos/);
});
test('schema errors return JSON with an actionable admin message and a private client message', async () => {
  const error = new Prisma.PrismaClientKnownRequestError('Missing column', { code:'P2022', clientVersion:'test' });
  const admin = catalogFailure(error, 'ADMIN'); assert.equal(admin.status,503); assert.match((await admin.json()).error, /npm run db:push/);
  const client = catalogFailure(error, 'CLIENTE'); assert.equal(client.status,503); const data=await client.json(); assert.match(data.error,/temporalmente/); assert.ok(!data.error.includes('db:push'));
});

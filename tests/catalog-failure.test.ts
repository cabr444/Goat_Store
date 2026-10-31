import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { catalogFailureCode, catalogFailure } from '../lib/catalog-failure';
test('database diagnostics distinguish initialization failures and keep credentials private', async () => {
  const secret = 'postgresql://private-user:private-password@example.com/private-db';
  const unreachable = new Prisma.PrismaClientInitializationError(secret, 'test', 'P1001');
  assert.equal(catalogFailureCode(unreachable), 'P1001');
  assert.equal(catalogFailureCode(new Error(secret)), 'UNKNOWN');
  const missing = new Prisma.PrismaClientKnownRequestError(secret, { code: 'P2021', clientVersion: 'test' });
  assert.equal(catalogFailureCode(missing), 'P2021');
  for (const error of [unreachable, missing]) {
    const guest = await catalogFailure(error).json(), admin = await catalogFailure(error, 'ADMIN').json();
    assert.equal(guest.error, 'El catálogo no está disponible temporalmente. Inténtalo más tarde.');
    assert.ok(admin.error.includes(catalogFailureCode(error)));
    assert.ok(!JSON.stringify([guest, admin]).includes('private-password'));
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import { releaseHistoricalAccess } from '../lib/streaming-inventory';

for (const status of ['soldAt', 'retiredAt'] as const) {
  test(`restocking ${status} frees the identity without changing credentials or order history`, async () => {
    const row = { id: 'old-entry', fingerprint: 'identity', version: 3, soldAt: null, retiredAt: null, [status]: new Date(), cipher: 'original', orderItemId: 'previous-sale' };
    let calls = 0;
    const tx = { streamingAccess: {
      findUnique: async () => row,
      updateMany: async ({ where, data }: any) => {
        calls++; assert.equal(where.version, 3); assert.equal(where.id, row.id);
        assert.ok(where.OR.some((condition: any) => condition[status]?.not === null));
        assert.deepEqual(Object.keys(data).sort(), ['fingerprint', 'version']);
        assert.equal(data.fingerprint, 'history:old-entry:identity');
        return { count: 1 };
      },
    } } as unknown as Prisma.TransactionClient;
    await releaseHistoricalAccess(tx, 'identity');
    assert.equal(calls, 1);
  });
}

test('restocking never frees an available identity', async () => {
  const tx = { streamingAccess: {
    findUnique: async () => ({soldAt:null, retiredAt:null}),
    updateMany: async () => { throw Error('Available entry must not change'); },
  } } as unknown as Prisma.TransactionClient;
  await releaseHistoricalAccess(tx, 'identity');
});


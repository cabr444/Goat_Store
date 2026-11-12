import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Prisma } from '@prisma/client';
import { assertAccountMode, AccountModeError } from '../lib/streaming-account-mode';
import { encryptPrivate } from '../lib/private-delivery';

test('mode conflicts consider available accounts and do not consult historic receipts', async () => {
  const old = process.env.DELIVERY_SECRET;
  process.env.DELIVERY_SECRET = 'restock-test-secret-at-least-32-characters';
  try {
    const delivery = {brand:'Test',email:'test@example.com',password:'password',profile:'Cuenta completa',pin:''};
    let active = false;
    const tx = { streamingAccess: { findMany: async ({where}: any) => {
      assert.equal(where.soldAt, null); assert.equal(where.retiredAt, null);
      return active ? [{id:'active', productId:'full',productIds:[],fingerprint:'full',cipher:encryptPrivate(JSON.stringify(delivery))}] : [];
    } }, product: { findMany: async () => [{id:'full',name:'Prime Video cuenta completa'}] },
    orderItem: { findMany: async () => {throw Error('Historic receipts must not block restocking');} },
    } as unknown as Prisma.TransactionClient;
    await assertAccountMode(tx, 'Prime Video', [{...delivery,profile:'1'}], false);
    active = true;
    await assert.rejects(assertAccountMode(tx, 'Prime Video', [{...delivery,profile:'1'}], false), AccountModeError);
  } finally {
    if (old === undefined) delete process.env.DELIVERY_SECRET; else process.env.DELIVERY_SECRET = old;
  }
});

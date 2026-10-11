import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Prisma} from '@prisma/client';
import {db} from '../lib/db';
import {POST} from '../app/api/auth/register/route';

test('registration rejects normalized duplicate emails and concurrent duplicates', async () => {
  const originalFind = db.user.findUnique;
  const originalCreate = db.user.create;
  const request = () => new Request('http://localhost/api/auth/register', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name: 'Test User', email: ' USER@Example.com ', password: 'test-password-123', role: 'CLIENTE'}),
  });
  try {
    db.user.findUnique = (async (args: {where: {email: string}}) => {
      assert.equal(args.where.email, 'user@example.com');
      return {id: 'existing'};
    }) as unknown as typeof db.user.findUnique;
    let response = await POST(request());
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, 'Este correo ya está registrado.');
    db.user.findUnique = (async () => null) as unknown as typeof db.user.findUnique;
    db.user.create = (async () => {
      throw new Prisma.PrismaClientKnownRequestError('Duplicate email', {code: 'P2002', clientVersion: Prisma.prismaVersion.client});
    }) as unknown as typeof db.user.create;
    response = await POST(request());
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, 'Este correo ya está registrado.');
  } finally {
    db.user.findUnique = originalFind;
    db.user.create = originalCreate;
  }
});

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
const database=new URL(process.env.DATABASE_URL || 'postgresql://invalid');
const base=new URL(process.env.PUSH_TEST_URL || 'http://127.0.0.1:3140');
if(!['localhost','127.0.0.1'].includes(database.hostname) || database.pathname !== '/goat_inventory_test' || !['localhost','127.0.0.1'].includes(base.hostname)) throw Error('Use an isolated local goat_inventory_test database and local server.');
const db=new PrismaClient(),users=[],suffix=randomUUID();
const endpoint=`https://fcm.googleapis.com/fcm/send/test-${suffix}`;
const subscription={endpoint,keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}};
async function user(role){const row=await db.user.create({data:{name:'Push fixture',email:`push-${role}-${suffix}@example.com`,passwordHash:'fixture',role}});users.push(row.id);return new SignJWT({uid:row.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET));}
async function request(token,method,body){const response=await fetch(new URL('/api/admin/push',base),{method,headers:{Cookie:`goat_session=${token || ''}`,Origin:base.origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json()};}
try{
  const admin=await user('ADMIN'),other=await user('VENDEDOR'),client=await user('CLIENTE');
  for(const token of [undefined,other,client]){
    assert.equal((await request(token,'GET')).status,403);
    assert.equal((await request(token,'POST',{subscription})).status,403);
    assert.equal((await request(token,'DELETE',{endpoint})).status,403);
  }
  const config=await request(admin,'GET');assert.equal(config.status,200);
  assert.ok(config.data.configured,'Configure test VAPID keys on the local server.');
  assert.ok(!JSON.stringify(config).includes(process.env.VAPID_PRIVATE_KEY || 'not-a-real-key'));
  for(const invalid of ['https://localhost/internal','http://fcm.googleapis.com/test','https://example.com']) assert.equal((await request(admin,'POST',{subscription:{...subscription,endpoint:invalid}})).status,400);
  assert.equal((await request(admin,'POST',{subscription})).status,200);
  assert.equal((await request(admin,'POST',{subscription})).status,200);
  const rows=await db.adminPushSubscription.findMany({where:{userId:users[0]}});assert.equal(rows.length,1);assert.ok(!rows[0].cipher.includes(endpoint));
  assert.equal((await request(admin,'DELETE',{endpoint})).status,200);
  assert.equal(await db.adminPushSubscription.count({where:{userId:users[0]}}),0);
  console.log('PASS admin push permissions, endpoint restrictions, idempotent registration, encrypted storage and unsubscribe. No real push was sent.');
}finally{await db.user.deleteMany({where:{id:{in:users}}});await db.$disconnect();}

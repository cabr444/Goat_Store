import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { decryptPrivate } from '../lib/private-delivery.ts';
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
const base = new URL(process.env.SHARED_STREAMING_TEST_URL || 'http://127.0.0.1:3140');
if (!['localhost','127.0.0.1'].includes(database.hostname) || database.pathname !== '/goat_inventory_test' || !['localhost','127.0.0.1'].includes(base.hostname)) throw Error('Use an isolated local test database and server.');
const db = new PrismaClient(), users = [], products = [], suffix = randomUUID();
async function user(role, balance = 1000000) {
  const value = await db.user.create({data:{name:'Shared '+role,email:`shared-${role}-${users.length}-${suffix}@example.com`,passwordHash:'fixture',role,balance}}); users.push(value);
  return {...value, token:await new SignJWT({uid:value.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET))};
}
async function product(name, category = 'Streaming') { const value = await db.product.create({data:{name,category,price:1000,stock:category === 'Combos' ? 10 : 0}}); products.push(value); return value; }
async function request(path, token, method = 'GET', body) {
  const response = await fetch(base.origin+path, {method,headers:{Cookie:'goat_session='+(token||''),Origin:base.origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  return {status:response.status,data:await response.json()};
}
const endpoint = '/api/admin/streaming-accounts';
const email = `account-${suffix}@example.com`;
const account = {brand:'STREAMING LT',email,password:'SharedPrivatePassword'};
const profiles = Array.from({length:7},(_,index)=>({profile:String(index+1),pin:String(1001+index)}));
try {
  const admin = await user('ADMIN'), client = await user('CLIENTE'), other = await user('CLIENTE'), seller = await user('VENDEDOR'), poor = await user('CLIENTE',0);
  const twenty = await product('Netflix x20 días'), twentyEight = await product('Netflix x28 días'), thirtyThree = await product('Netflix x33 días'), prime = await product('Prime Video');
  const ids = [twenty.id,twentyEight.id,thirtyThree.id];
  const body = {productIds:ids,account,profiles};
  for (const actor of [null,client,seller]) assert.equal((await request(endpoint,actor?.token,'POST',body)).status,403);
  assert.equal((await request(endpoint,admin.token,'POST',{...body,productIds:[twenty.id,prime.id]})).status,409);
  assert.equal((await request(endpoint,admin.token,'POST',{...body,profiles:[...profiles,{profile:'8',pin:''}]})).status,400);
  assert.equal((await request(endpoint,admin.token,'POST',{...body,profiles:[profiles[0],{profile:' 1 ',pin:''}]})).status,400);
  const created = await request(endpoint,admin.token,'POST',body); assert.equal(created.status,201,JSON.stringify(created)); assert.equal(created.data.added,7);
  assert.equal(await db.streamingAccess.count({where:{productId:{in:ids}}}),7);
  assert.equal((await request(endpoint,admin.token,'POST',body)).data.added,0);
  async function stocks(expected) {
    const response = await request('/api/products',client.token);
    for (const id of ids) { assert.equal(response.data.products.find(p=>p.id===id).stock,expected); assert.equal((await db.product.findUniqueOrThrow({where:{id}})).stock,expected); }
    for(const secret of [email,account.password,'fingerprint','productIds','cipher']) assert.ok(!JSON.stringify(response.data).includes(secret));
  }
  await stocks(7);
  const buy = (actor, items, checkoutKey = randomUUID()) => request('/api/orders',actor.token,'POST',{items,checkoutKey});
  const zero = await buy(poor,[{id:twenty.id,qty:1}]); assert.equal(zero.status,400); await stocks(7);
  const first = await buy(client,[{id:twenty.id,qty:1}]); assert.equal(first.status,201,JSON.stringify(first)); await stocks(6);
  const sold = await db.streamingAccess.findFirstOrThrow({where:{soldAt:{not:null},productId:twenty.id}});
  const item = await db.orderItem.findUniqueOrThrow({where:{id:sold.orderItemId}}); const receipt = decryptPrivate(item.receiptCipher);
  const delivered = JSON.parse(decryptPrivate(sold.cipher)); assert.ok(receipt.includes('Plataforma: NETFLIX X20 DÍAS')); assert.ok(receipt.includes('Perfil: '+delivered.profile)); assert.ok(receipt.includes('Pin: '+delivered.pin));
  // A cart requiring more unique profiles than exist must roll back completely.
  const before = (await db.user.findUniqueOrThrow({where:{id:client.id}})).balance;
  assert.equal((await buy(client,[{id:twenty.id,qty:4},{id:twentyEight.id,qty:3}])).status,400);
  assert.equal((await db.user.findUniqueOrThrow({where:{id:client.id}})).balance,before); await stocks(6);
  const mixed = await buy(client,ids.map(id=>({id,qty:1}))); assert.equal(mixed.status,201,JSON.stringify(mixed)); await stocks(3);
  const mixedItems = await db.orderItem.findMany({where:{orderId:mixed.data.orderId}});
  const assigned = await db.streamingAccess.findMany({where:{orderItemId:{in:mixedItems.map(i=>i.id)}}}); assert.equal(assigned.length,3); assert.equal(new Set(assigned.map(row=>row.id)).size,3);
  // Bundles use the x28 eligibility even when the shared record's primary product is x20.
  assert.equal((await request(`/api/admin/products/${prime.id}/inventory`,admin.token,'POST',{platform:'Prime Video',delivery:{...account,email:`prime-${suffix}@example.com`,profile:'1',pin:''}})).status,201);
  const combo = await product('Combo x2: Netflix + Prime Video','Combos');
  assert.equal((await request('/api/products',client.token)).data.products.find(p=>p.id===combo.id).stock,1);
  const bundled = await buy(client,[{id:combo.id,qty:1}]); assert.equal(bundled.status,201,JSON.stringify(bundled)); await stocks(2);
  const comboItem = await db.orderItem.findFirstOrThrow({where:{orderId:bundled.data.orderId}}); assert.ok(decryptPrivate(comboItem.receiptCipher).includes('NETFLIX X28 DÍAS'));
  assert.equal((await buy(client,[{id:thirtyThree.id,qty:1}])).status,201); await stocks(1);
  const raced = await Promise.all([buy(client,[{id:twenty.id,qty:1}]),buy(other,[{id:thirtyThree.id,qty:1}])]); assert.deepEqual(raced.map(r=>r.status).sort(),[201,400]); await stocks(0);
  assert.equal(await db.streamingAccess.count({where:{productId:twenty.id,soldAt:{not:null}}}),7);
  const failed = await request(endpoint,admin.token,'POST',{...body,profiles:[{profile:'new',pin:''},{profile:delivered.profile,pin:delivered.pin}]}); assert.equal(failed.status,409); assert.equal(await db.streamingAccess.count({where:{productId:twenty.id}}),7);
  // Existing unsold entries can be linked, edited globally and retired globally.
  const extraAccount = {...account,email:`extra-${suffix}@example.com`};
  assert.equal((await request(`/api/admin/products/${twenty.id}/inventory`,admin.token,'POST',{platform:'Netflix',delivery:{...extraAccount,profile:'extra',pin:'7777'}})).status,201);
  const linked = await request(endpoint,admin.token,'POST',{productIds:ids,account:extraAccount,profiles:[{profile:'extra',pin:'7777'}]}); assert.equal(linked.data.linked,1); await stocks(1);
  let row = (await request(`/api/admin/products/${thirtyThree.id}/inventory`,admin.token)).data.accesses[0];
  assert.equal((await request(`/api/admin/products/${thirtyThree.id}/inventory`,admin.token,'PATCH',{accessId:row.id,version:row.version,platform:'Netflix',delivery:{...row.delivery,password:'UpdatedSharedPassword'}})).status,200);
  row = (await request(`/api/admin/products/${twentyEight.id}/inventory`,admin.token)).data.accesses[0]; assert.equal(row.delivery.password,'UpdatedSharedPassword');
  assert.equal((await request(`/api/admin/products/${twentyEight.id}/inventory`,admin.token,'DELETE',{accessId:row.id,version:row.version})).status,200); await stocks(0);
  // Emptying one plan detaches it without removing other plans' shared inventory.
  assert.equal((await request(endpoint,admin.token,'POST',{productIds:ids,account:{...account,email:`detach-${suffix}@example.com`},profiles:[{profile:'1',pin:''}]})).status,201);
  assert.equal((await request('/api/products/'+twenty.id,admin.token,'DELETE')).status,200);
  const catalog = (await request('/api/products',client.token)).data.products;
  assert.equal(catalog.find(p=>p.id===twenty.id).stock,0); assert.equal(catalog.find(p=>p.id===twentyEight.id).stock,1); assert.equal(catalog.find(p=>p.id===thirtyThree.id).stock,1);
  console.log('PASS shared streaming: seven profiles, admin-only batch, canonical identity, cross-plan stock, private receipts, mixed-cart uniqueness, bundle eligibility, concurrent allocation, sold-profile protection, linking, editing, retirement and plan detachment.');
} finally {
  const pids = products.map(p=>p.id), uids = users.map(u=>u.id);
  await db.streamingAccess.deleteMany({where:{OR:[{productId:{in:pids}},{productIds:{hasSome:pids}}]}});
  await db.orderItem.deleteMany({where:{order:{userId:{in:uids}}}}); await db.order.deleteMany({where:{userId:{in:uids}}}); await db.walletEvent.deleteMany({where:{userId:{in:uids}}});
  await db.product.deleteMany({where:{id:{in:pids}}}); await db.user.deleteMany({where:{id:{in:uids}}}); await db.$disconnect();
}

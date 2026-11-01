import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { encryptPrivate } from '../lib/private-delivery.ts';
import { accessFingerprint } from '../lib/streaming-inventory.ts';
const url=new URL(process.env.DATABASE_URL||'postgresql://invalid'),base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3140');
if(url.hostname!=='127.0.0.1'||url.pathname!='/goat_inventory_test'||base.hostname!=='127.0.0.1')throw Error('Isolated database/server required');
const db=new PrismaClient(),users=[],products=[],orders=[],suffix=randomUUID();
async function request(path,token='',method='GET',body,origin=base.origin){return fetch(base.origin+path,{method,headers:{Cookie:'goat_session='+token,Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
async function product(name,stock=0,category='Streaming',active=true){const p=await db.product.create({data:{name,stock,category,active,price:1000}});products.push(p);return p;}
try{
 for(const role of ['ADMIN','CLIENTE','VENDEDOR']){const u=await db.user.create({data:{name:role,email:`delete-${role}-${suffix}@example.com`,passwordHash:'fixture',role,balance:100000}});users.push({...u,token:await new SignJWT({uid:u.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET))});}
 const [admin,client,seller]=users,a=await product('Netflix x28 días '+suffix),b=await product('Netflix x33 días '+suffix),empty=await product('Agotado antiguo '+suffix,0,'Audio',false);
 const delivery={brand:'Fixture',email:`shared-${suffix}@example.com`,password:'PrivatePassword',profile:'1',pin:''};
 const shared=await db.streamingAccess.create({data:{productId:a.id,productIds:[b.id],platform:'netflix',fingerprint:accessFingerprint('netflix',delivery),cipher:encryptPrivate(JSON.stringify(delivery))}});
 const historical=await db.order.create({data:{userId:client.id,total:1000,items:{create:{productId:a.id,name:a.name,category:a.category,quantity:1,unitPrice:1000,receiptCipher:encryptPrivate('PrivateHistoryReceipt')}}},include:{items:true}});orders.push(historical.id);
 await db.expiryReminder.create({data:{id:'delete-history-'+suffix,orderItemId:historical.items[0].id,planName:a.name,quantity:1,durationDays:28,dueAt:new Date(Date.now()+86400000)}});
 const sold=await db.streamingAccess.create({data:{productId:a.id,platform:'netflix',fingerprint:accessFingerprint('netflix',{...delivery,profile:'sold'}),cipher:encryptPrivate(JSON.stringify({...delivery,profile:'sold'})),soldAt:new Date(),orderItemId:historical.items[0].id}});
 const endpoint='/api/admin/products/'+a.id;
 for(const token of ['',client.token,seller.token])assert.equal((await request(endpoint,token,'DELETE')).status,403);
 assert.equal((await request(endpoint,admin.token,'DELETE',undefined,'https://attacker.example')).status,403);
 assert.equal((await request(endpoint,admin.token,'DELETE')).status,200);
 assert.equal((await request(endpoint,admin.token,'DELETE')).status,200);
 for(const path of ['/api/products','/api/storefront'])for(const token of ['',admin.token,client.token]){const data=await(await request(path,token)).json();assert.ok(!data.products.some(p=>p.id===a.id));assert.equal(data.products.find(p=>p.id===b.id).stock,1);assert.ok(data.products.some(p=>p.id===empty.id));}
 const moved=await db.streamingAccess.findUniqueOrThrow({where:{id:shared.id}});assert.equal(moved.productId,b.id);assert.deepEqual(moved.productIds,[]);assert.equal(moved.retiredAt,null);
 assert.ok((await db.streamingAccess.findUniqueOrThrow({where:{id:sold.id}})).soldAt);assert.equal(await db.order.count({where:{id:historical.id}}),1);assert.equal(await db.expiryReminder.count({where:{orderItemId:historical.items[0].id}}),1);
 const history=await request('/administracion/ventas/'+historical.id,admin.token);assert.equal(history.status,200);assert.ok((await history.text()).includes('PrivateHistoryReceipt'));
 const balance=(await db.user.findUniqueOrThrow({where:{id:client.id}})).balance;
 assert.equal((await request('/api/orders',client.token,'POST',{checkoutKey:randomUUID(),items:[{id:a.id,qty:1}]})).status,400);assert.equal((await db.user.findUniqueOrThrow({where:{id:client.id}})).balance,balance);
 assert.equal((await request('/api/products/'+a.id+'/duplicate',admin.token,'POST',{})).status,404);
 assert.equal((await request('/api/products/'+a.id,admin.token,'PATCH',{...a,expectedStock:0,stock:99})).status,404);
 assert.equal((await request('/api/admin/products/'+a.id+'/inventory',admin.token,'POST',{platform:'netflix',delivery})).status,404);
 assert.equal((await request('/api/admin/streaming-accounts',admin.token,'POST',{productIds:[a.id],account:{brand:delivery.brand,email:delivery.email,password:delivery.password},profiles:[{profile:'2',pin:''}]})).status,409);
 const c=await product('Delete physical C '+suffix,4,'Vasos'),d=await product('Delete physical D '+suffix,4,'Camisetas');
 const deletes=await Promise.all([c,d].map(p=>request('/api/admin/products/'+p.id,admin.token,'DELETE')));assert.deepEqual(deletes.map(r=>r.status),[200,200]);
 const marker=await db.catalogOrder.findUniqueOrThrow({where:{kind:'deleted-products'}});for(const id of [a.id,c.id,d.id])assert.ok(marker.ids.includes(id));
 assert.equal((await request('/api/admin/products/'+b.id,admin.token,'DELETE')).status,200);assert.ok((await db.streamingAccess.findUniqueOrThrow({where:{id:shared.id}})).retiredAt);
 console.log('PASS product deletion: admin/origin protection, catalogue removal for every role, stock-zero legacy visibility, stale-cart rejection, no wallet changes, immutable sales/receipts/reminders, shared profile transfer, exclusive retirement, blocked resurrection, repeat safety and concurrent deletes.');
}finally{await db.streamingAccess.deleteMany({where:{productId:{in:products.map(p=>p.id)}}});await db.orderItem.deleteMany({where:{orderId:{in:orders}}});await db.order.deleteMany({where:{id:{in:orders}}});await db.product.deleteMany({where:{id:{in:products.map(p=>p.id)}}});await db.walletEvent.deleteMany({where:{userId:{in:users.map(u=>u.id)}}});await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await db.catalogOrder.deleteMany({where:{kind:'deleted-products'}});await db.$disconnect();}

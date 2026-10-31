import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { backfillExpiryReminders } from '../lib/expiry-backfill.ts';
import { encryptPrivate, receiptText } from '../lib/private-delivery.ts';
import { sendDueExpiryEmails } from '../lib/expiry-notifications.ts';
import { db as sharedDb } from '../lib/db.ts';
const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid'), base = new URL(process.env.INVENTORY_TEST_URL || 'http://127.0.0.1:3140');
if (url.hostname !== '127.0.0.1' || url.pathname !== '/goat_inventory_test' || base.hostname !== '127.0.0.1') throw Error('Isolated local database/server required');
const db = new PrismaClient(), suffix = randomUUID(), users = [], products = [], orders = [];
async function request(path, token, method='GET', body) { const response=await fetch(base.origin+path,{method,headers:{Cookie:'goat_session='+(token||''),Origin:base.origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'}); return response; }
try {
 for (const role of ['ADMIN','CLIENTE']) { const user=await db.user.create({data:{name:'Expiry '+role,email:`expiry-${role}-${suffix}@example.com`,role,passwordHash:'fixture',balance:1000000}});users.push({...user,token:await new SignJWT({uid:user.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET))}); }
 const [admin,client]=users;
 for(const [name,category,reminderDays] of [['Chat GPT x20 Dias','Productividad',null],['Chat GPT x27 Dias','Productividad',null],['Spotify','Música',15],['Office permanente','Productividad',null],['Vaso','Vasos',null]])products.push(await db.product.create({data:{name,category,reminderDays,price:1000,stock:10}}));
 const key=randomUUID(),body={checkoutKey:key,items:[{id:products[0].id,qty:1},{id:products[1].id,qty:2},{id:products[2].id,qty:1},{id:products[3].id,qty:1},{id:products[4].id,qty:1}]};
 const bought=await request('/api/orders',client.token,'POST',body);assert.equal(bought.status,201);const result=await bought.json();orders.push(result.orderId);
 assert.equal((await request('/api/orders',client.token,'POST',body)).status,200);
 const scheduled=await db.expiryReminder.findMany({where:{orderItem:{orderId:result.orderId}},include:{orderItem:{include:{order:true}}},orderBy:{durationDays:'asc'}});
 assert.equal(scheduled.length,3);assert.deepEqual(scheduled.map(row=>row.durationDays),[15,20,27]);assert.equal(scheduled.find(row=>row.durationDays===27).quantity,2);
 for(const row of scheduled)assert.equal(row.dueAt.getTime()-row.orderItem.order.createdAt.getTime(),row.durationDays*86400000);
 await db.product.update({where:{id:products[0].id},data:{name:'Plan renombrado',reminderDays:99}});
 assert.equal((await db.expiryReminder.findUniqueOrThrow({where:{id:scheduled[1].id}})).planName,'Chat GPT x20 Dias');
 const adminBuy=await request('/api/orders',admin.token,'POST',{checkoutKey:randomUUID(),items:[{id:products[0].id,qty:1}]});assert.equal(adminBuy.status,201);const adminOrder=(await adminBuy.json()).orderId;orders.push(adminOrder);assert.equal(await db.expiryReminder.count({where:{orderItem:{orderId:adminOrder}}}),0);
 assert.equal((await request('/api/admin/notifications',client.token)).status,403);assert.equal((await request('/administracion/notificaciones',client.token)).status,307);
 assert.equal((await request('/api/cron/expiry-reminders')).status,401);
 const due=scheduled[0];await db.expiryReminder.update({where:{id:due.id},data:{dueAt:new Date(Date.now()-1000)}});
 assert.equal((await (await request('/api/admin/notifications',admin.token)).json()).unread,1);
 const page=await request('/administracion/notificaciones',admin.token);assert.equal(page.status,200);assert.ok((await page.text()).includes(client.email));
 const old={RESEND_API_KEY:process.env.RESEND_API_KEY,EMAIL_FROM:process.env.EMAIL_FROM,APP_URL:process.env.APP_URL};
 process.env.RESEND_API_KEY='test-not-a-real-key';process.env.EMAIL_FROM='Tests <tests@example.com>';process.env.APP_URL=base.origin;
 try {
  const calls=[];const mock=async(_url,init)=>{calls.push(init);return new Response('{}',{status:200});};
  await Promise.all([sendDueExpiryEmails(new Date(),mock),sendDueExpiryEmails(new Date(),mock)]);
  assert.equal(calls.length,1);const email=JSON.parse(calls[0].body);assert.ok(email.text.includes(client.email));assert.ok(email.text.includes(result.reference));assert.ok(email.text.includes('/administracion/ventas/'));assert.equal(email.to.includes(admin.email),true);
  assert.equal((await db.expiryReminder.findUniqueOrThrow({where:{id:due.id}})).emailedAt instanceof Date,true);
  await sendDueExpiryEmails(new Date(),mock);assert.equal(calls.length,1);
  const next=scheduled[1];await db.expiryReminder.update({where:{id:next.id},data:{dueAt:new Date(Date.now()-1000)}});
  const failed=await sendDueExpiryEmails(new Date(),async()=>new Response('{}',{status:500}));assert.equal(failed.failed,1);assert.equal((await db.expiryReminder.findUniqueOrThrow({where:{id:next.id}})).emailedAt,null);
  assert.equal((await sendDueExpiryEmails(new Date(),mock)).sent,1);
 }finally{for(const [key,value]of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
 assert.equal((await request(`/api/admin/notifications/${due.id}`,client.token,'PATCH',{})).status,403);
 assert.equal((await request(`/api/admin/notifications/${due.id}`,admin.token,'PATCH',{})).status,200);
 assert.equal((await (await request('/api/admin/notifications',admin.token)).json()).unread,1);
 // Historical reminders must use saved names/dates, never the current 99-day override.
 const past=new Date(Date.now()-100*86400000);
 const comboProduct=await db.product.create({data:{name:'Combo Netflix + Prime Video',category:'Combos',price:1000}});products.push(comboProduct);
 const account={brand:'History fixture',email:'fixture@example.com',password:'NeverExposeHistorySecret',profile:'1',pin:''};
 const comboReceipt=['Netflix x28 días','Amazon Prime Video','Netflix x28 días','Amazon Prime Video'].map(name=>receiptText(account,name,'HISTORY',past,1,null)).join('\n\n');
 const historical=await db.order.create({data:{userId:client.id,total:3000,createdAt:past,items:{create:[{productId:products[0].id,name:'Chat GPT x20 Dias',category:'Productividad',quantity:1,unitPrice:1000},{productId:comboProduct.id,name:comboProduct.name,category:'Combos',quantity:2,unitPrice:1000,receiptCipher:encryptPrivate(comboReceipt)}]}},include:{items:true}});orders.push(historical.id);
 const previous=await db.expiryReminder.findUniqueOrThrow({where:{id:due.id}});
 const imports=await Promise.all([backfillExpiryReminders(),backfillExpiryReminders()]);assert.equal(imports.reduce((sum,row)=>sum+row.added,0),3);
 const imported=await db.expiryReminder.findMany({where:{orderItem:{orderId:historical.id}},orderBy:{durationDays:'asc'}});
 assert.deepEqual(imported.map(row=>row.durationDays),[20,28,30]);assert.deepEqual(imported.map(row=>row.quantity),[1,2,2]);
 for(const row of imported)assert.equal(row.dueAt.getTime()-past.getTime(),row.durationDays*86400000);
 assert.deepEqual(await db.expiryReminder.findUniqueOrThrow({where:{id:due.id}}),previous);
 assert.equal((await backfillExpiryReminders()).added,0);
 const marker=await db.catalogOrder.findUniqueOrThrow({where:{kind:'expiry-history-cutoff-v1'}});
 const later=await db.order.create({data:{userId:client.id,total:1000,createdAt:new Date(new Date(marker.ids.cutoff).getTime()+1000),items:{create:{productId:products[0].id,name:'Chat GPT x20 Dias',category:'Productividad',quantity:1,unitPrice:1000}}}});orders.push(later.id);
 assert.equal((await backfillExpiryReminders()).added,0);assert.equal(await db.expiryReminder.count({where:{orderItem:{orderId:later.id}}}),0);
 assert.equal((await request('/api/admin/notifications/backfill',client.token,'POST',{})).status,403);
 assert.equal((await request('/api/admin/notifications/backfill',admin.token,'POST',{})).status,200);
 console.log('PASS expiry reminders: concurrent duplicate-safe history import, immutable receipts/date/durations, future cutoff, historical combo quantities, duration detection/override, immutable schedules, multi-item quantities, checkout replay, admin purchase exclusion, admin-only notifications, cron authentication, concurrent mocked email idempotency, failed-send retry and reviewed state. No real emails sent.');
}finally{
 await db.catalogOrder.deleteMany({where:{kind:'expiry-history-cutoff-v1'}});
 await db.checkoutAttempt.deleteMany({where:{orderId:{in:orders}}});await db.orderItem.deleteMany({where:{orderId:{in:orders}}});await db.order.deleteMany({where:{id:{in:orders}}});await db.walletEvent.deleteMany({where:{userId:{in:users.map(u=>u.id)}}});await db.product.deleteMany({where:{id:{in:products.map(p=>p.id)}}});await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await db.$disconnect();await sharedDb.$disconnect();
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { allowedPushEndpoint, purchasePush, pushSubscriptionSchema } from '../lib/push-schema';
import { encryptPrivate } from '../lib/private-delivery';
import webpush from 'web-push';

test('push endpoints only allow trusted HTTPS browser services', () => {
  for(const url of ['https://fcm.googleapis.com/fcm/send/device','https://updates.push.services.mozilla.com/wpush/v2/device','https://web.push.apple.com/device']) assert.ok(allowedPushEndpoint(url));
  for(const url of ['http://fcm.googleapis.com/device','https://fcm.googleapis.com.evil.test/device','https://localhost/device','https://127.0.0.1/device','https://fcm.googleapis.com:444/device','https://user:password@fcm.googleapis.com/device','https://example.com/device','https://evil.push.services.mozilla.com.evil.test/device']) assert.ok(!allowedPushEndpoint(url),url);
  assert.ok(!pushSubscriptionSchema.safeParse({endpoint:'https://fcm.googleapis.com/device',keys:{auth:'invalid',p256dh:'invalid'}}).success);
});
test('purchase alerts have one order tag, a private admin link and no customer details', () => {
  const value=purchasePush({id:'order/1',reference:'P20',total:6000,items:[{name:'Youtube Correo Personal',quantity:1}]});
  assert.equal(value.tag,'purchase-order/1');assert.equal(value.url,'/administracion/ventas/order%2F1');
  assert.match(value.body,/1 × Youtube Correo Personal/);assert.match(value.body,/P20/);assert.match(value.body,/6\.000/);
  assert.deepEqual(Object.keys(value).sort(),['body','tag','title','url']);
});
test('service worker displays pushes and rejects off-site notification links', async () => {
  const handlers:Record<string,Function>={}, shown:unknown[]=[];
  let opened='';
  const self={location:{origin:'https://store.example.com'},addEventListener:(name:string,fn:Function)=>handlers[name]=fn,
    registration:{showNotification:async(...args:unknown[])=>{shown.push(args);}},
    clients:{matchAll:async()=>[],openWindow:async(url:string)=>{opened=url;}}};
  runInNewContext(readFileSync('public/push-sw.js','utf8'),{self,URL});
  let pending:Promise<unknown>=Promise.resolve();const waitUntil=(promise:Promise<unknown>)=>{pending=promise;};
  handlers.push({data:{json:()=>purchasePush({id:'abc',reference:'P1',total:1000,items:[{name:'Netflix',quantity:2}]})},waitUntil});await pending;assert.equal(shown.length,1);
  handlers.notificationclick({notification:{close(){},data:{url:'https://attacker.example.com'}},waitUntil});assert.equal(opened,'');
  handlers.notificationclick({notification:{close(){},data:{url:'/administracion/ventas/abc'}},waitUntil});await pending;assert.equal(opened,'https://store.example.com/administracion/ventas/abc');
});
test('push queue handles accepted, transient, expired and revoked deliveries without network access', async () => {
  const originalEnv={AUTH_SECRET:process.env.AUTH_SECRET,VAPID_PUBLIC_KEY:process.env.VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY:process.env.VAPID_PRIVATE_KEY,VAPID_SUBJECT:process.env.VAPID_SUBJECT};
  const originalSend=webpush.sendNotification;
  const globals=globalThis as unknown as {prisma?:unknown};const originalDb=globals.prisma;
  process.env.AUTH_SECRET='isolated-push-testing-secret-at-least-32-characters';
  const keys=webpush.generateVAPIDKeys();process.env.VAPID_PUBLIC_KEY=keys.publicKey;process.env.VAPID_PRIVATE_KEY=keys.privateKey;process.env.VAPID_SUBJECT='mailto:test@example.com';
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/device',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}};
  let rows:any[]=[],updates:any[]=[],deleted:any[]=[],queued:any[]=[],sends=0;
  const fake={adminPushSubscription:{findMany:async()=>[{id:'phone'}],deleteMany:async(args:unknown)=>{deleted.push(args);return{count:1};}},
    adminPushDelivery:{findMany:async()=>rows,updateMany:async(args:any)=>{updates.push(args);return{count:1};},createMany:async(args:any)=>{queued.push(args);return{count:1};}}};
  globals.prisma=fake;
  try {
    const {queuePurchasePush,deliverPurchasePushes}=await import('../lib/admin-push');
    await queuePurchasePush(fake as any,'order',new Date());
    assert.equal(queued[0].skipDuplicates,true);assert.deepEqual(queued[0].data,[{orderId:'order',subscriptionId:'phone'}]);
    const row={id:'delivery',subscriptionId:'phone',order:{id:'order',reference:'P1',total:6000,items:[{name:'Youtube Correo Personal',quantity:1}]},subscription:{cipher:encryptPrivate(JSON.stringify(subscription)),user:{role:'ADMIN'}}};
    rows=[row];
    webpush.sendNotification=(async(_subscription, payload)=>{assert.match(String(payload),/Youtube Correo Personal/);sends++;return{statusCode:201,body:'',headers:{}};}) as typeof webpush.sendNotification;
    assert.deepEqual(await deliverPurchasePushes('order'),{sent:1,failed:0});assert.equal(sends,1);assert.ok(updates.some(update=>update.data.sentAt instanceof Date));
    updates=[];webpush.sendNotification=(async()=>{throw Object.assign(Error('temporary'),{statusCode:503});}) as typeof webpush.sendNotification;
    assert.deepEqual(await deliverPurchasePushes('order'),{sent:0,failed:1});assert.ok(updates.some(update=>update.data.claimedAt===null && !update.data.sentAt));assert.equal(deleted.length,0);
    webpush.sendNotification=(async()=>{throw Object.assign(Error('expired'),{statusCode:410});}) as typeof webpush.sendNotification;
    await deliverPurchasePushes('order');assert.equal(deleted.length,1);
    rows=[{...row,subscription:{...row.subscription,user:{role:'CLIENTE'}}}];sends=0;
    webpush.sendNotification=(async()=>{sends++;return{statusCode:201,body:'',headers:{}};}) as typeof webpush.sendNotification;
    await deliverPurchasePushes('order');assert.equal(sends,0);assert.equal(deleted.length,2);
    rows=[];assert.deepEqual(await deliverPurchasePushes('order'),{sent:0,failed:0});
  } finally {
    webpush.sendNotification=originalSend;globals.prisma=originalDb;
    for(const [name,value] of Object.entries(originalEnv)) {if(value===undefined)delete process.env[name];else process.env[name]=value;}
  }
});

test('multi-product alerts show quantities and bound the payload size',()=>{
  const value=purchasePush({id:'order',reference:'P2',total:15000,items:[{name:'Netflix x30 días',quantity:2},{name:'Spotify',quantity:1}]});
  assert.match(value.body,/2 × Netflix x30 días, 1 × Spotify/);
  const large=purchasePush({id:'order',reference:'P3',total:10000,items:Array.from({length:50},()=>({name:'🎁'.repeat(200),quantity:50}))});
  assert.match(large.body,/y 47 más/);assert.ok(Buffer.byteLength(JSON.stringify(large),'utf8')<3000);
});

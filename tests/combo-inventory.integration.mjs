import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { encryptPrivate, decryptPrivate } from '../lib/private-delivery.ts';
import { accessFingerprint } from '../lib/streaming-inventory.ts';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid'),base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3113');
if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!='/goat_inventory_test'||!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use only the isolated local test database/server');
const db=new PrismaClient(),users=[],products=[],suffix=randomUUID();let sequence=0;
async function user(role,balance=1000000){const u=await db.user.create({data:{name:'Combo '+role,email:`combo-${randomUUID()}@example.com`,passwordHash:'fixture',role,balance}});users.push(u);return {...u,token:await new SignJWT({uid:u.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET))};}
async function product(name,extra={}){const p=await db.product.create({data:{name,category:'Streaming',price:1000,stock:0,...extra}});products.push(p);return p;}
async function access(p,profile){const delivery={brand:'STREAMING LT',email:`combo-access-${sequence++}-${suffix}@example.com`,password:'PrivateComboSecret',profile:profile||'1',pin:'3311'};await db.streamingAccess.create({data:{productId:p.id,platform:p.name.toLowerCase().includes('netflix')?'netflix':p.name.toLowerCase().includes('prime')?'prime':'paramount',fingerprint:accessFingerprint(p.name,delivery),cipher:encryptPrivate(JSON.stringify(delivery))}});await db.product.update({where:{id:p.id},data:{stock:{increment:1}}});}
async function request(path,u,method='GET',body){const r=await fetch(base.origin+path,{method,headers:{Cookie:'goat_session='+u.token,Origin:base.origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const buy=(u,items,key=randomUUID())=>request('/api/orders',u,'POST',{items,checkoutKey:key});
const stock=async p=>(await db.product.findUniqueOrThrow({where:{id:p.id}})).stock;
const available=async p=>db.streamingAccess.count({where:{productId:p.id,soldAt:null,retiredAt:null}});
try{
 const admin=await user('ADMIN'),buyer=await user('CLIENTE'),other=await user('CLIENTE'),poor=await user('CLIENTE',0),seller=await user('VENDEDOR');
 const netflix=await product('Netflix x28 días'),wrong=await product('Netflix x33 días'),fullNetflix=await product('Netflix cuenta completa x28 días'),prime=await product('Amazon Prime Video'),fullPrime=await product('Prime Video cuenta completa'),paramount=await product('Paramount+');
 for(let i=0;i<8;i++)await access(netflix);for(let i=0;i<6;i++)await access(prime);for(let i=0;i<2;i++){await access(wrong);await access(fullNetflix);await access(fullPrime);await access(paramount);}
 await access(prime,'Cuenta completa');
 const mismatched=await product('Prime Video');await access(mismatched);await db.streamingAccess.updateMany({where:{productId:mismatched.id},data:{platform:'netflix'}});
 const combo=await product('Combo x2: Netflix + Prime Video',{category:'Combos',stock:10,price:15000,ownerId:admin.id,deliveryCipher:encryptPrivate(JSON.stringify({brand:'OLD',email:'old@example.com',password:'NeverDeliverLegacyCombo',profile:'Old',pin:''}))});
 const triple=await product('Combo x3: Netflix + Prime Video + Paramount',{category:'Combos',stock:10,price:16000});
 const invalid=await product('Combo Netflix + Spotify',{category:'Combos',stock:10});
 const sellerCombo=await product('Combo Netflix + Prime Video',{category:'Combos',stock:10,ownerId:seller.id});
 let catalog=(await request('/api/products',buyer)).data.products;
 assert.equal(catalog.find(p=>p.id===combo.id).stock,6);assert.equal(catalog.find(p=>p.id===combo.id).configuredStock,10);assert.equal(catalog.find(p=>p.id===triple.id).stock,2);assert.equal(catalog.find(p=>p.id===invalid.id).stock,0);assert.equal(catalog.find(p=>p.id===sellerCombo.id).stock,0);
 assert.ok(!JSON.stringify(catalog).includes('PrivateComboSecret'));assert.ok(!JSON.stringify(catalog).includes('cipher'));
 const bootstrap=(await request('/api/storefront',buyer)).data;assert.equal(bootstrap.products.find(p=>p.id===combo.id).stock,6);
 assert.equal((await request(`/api/admin/products/${combo.id}/delivery`,admin,'PUT',{brand:'No',email:'x@example.com',password:'x',profile:'1',pin:''})).status,409);
 const key=randomUUID(),first=await buy(buyer,[{id:combo.id,qty:2}],key);assert.equal(first.status,201,JSON.stringify(first));
 const order=await db.order.findUniqueOrThrow({where:{id:first.data.orderId},include:{items:true}});assert.equal(order.status,'ENTREGADO');assert.equal(order.total,30000);assert.equal(order.items.length,1);assert.equal(order.items[0].quantity,2);
 const receipt=decryptPrivate(order.items[0].receiptCipher);assert.match(receipt,/NETFLIX X28 DÍAS/);assert.match(receipt,/AMAZON PRIME VIDEO/);assert.ok(!receipt.includes('NeverDeliverLegacyCombo'));assert.equal((receipt.match(/Correo:/g)||[]).length,4);
 assert.equal(await stock(combo),8);assert.equal(await stock(netflix),6);assert.equal(await stock(prime),5);assert.equal(await available(netflix),6);assert.equal(await available(prime),5);
 const assigned=await db.streamingAccess.findMany({where:{orderItemId:order.items[0].id}});assert.equal(assigned.length,4);assert.equal(new Set(assigned.map(a=>a.id)).size,4);
 assert.equal((await buy(buyer,[{id:combo.id,qty:2}],key)).status,200);assert.equal(await stock(combo),8);assert.equal((await buy(other,[{id:combo.id,qty:2}],key)).status,409);
 // Mixed single and combo lines must receive different physical access rows.
 const mixed=await buy(buyer,[{id:combo.id,qty:1},{id:netflix.id,qty:1},{id:triple.id,qty:1}]);assert.equal(mixed.status,201,JSON.stringify(mixed));
 const mixedItems=await db.orderItem.findMany({where:{orderId:mixed.data.orderId}});assert.equal(await db.streamingAccess.count({where:{orderItemId:{in:mixedItems.map(i=>i.id)}}}),6);
 assert.equal(await available(netflix),3);assert.equal(await available(prime),3);assert.equal(await available(paramount),1);assert.equal(await stock(combo),7);
 const balance=(await db.user.findUniqueOrThrow({where:{id:buyer.id}})).balance,comboStock=await stock(combo);
 assert.equal((await buy(buyer,[{id:combo.id,qty:3}])).status,400);assert.equal(await stock(combo),comboStock);assert.equal((await db.user.findUniqueOrThrow({where:{id:buyer.id}})).balance,balance);
 assert.equal((await buy(poor,[{id:combo.id,qty:1}])).status,400);assert.equal(await stock(combo),comboStock);assert.equal(await available(prime),3);
 assert.equal((await buy(buyer,[{id:invalid.id,qty:1}])).status,400);assert.equal((await buy(buyer,[{id:sellerCombo.id,qty:1}])).status,400);
 // Three simultaneous buyers compete for the final two eligible Prime profiles.
 const races=await Promise.all([buy(buyer,[{id:combo.id,qty:1}]),buy(other,[{id:combo.id,qty:1}]),buy(buyer,[{id:combo.id,qty:1}])]);assert.deepEqual(races.map(r=>r.status).sort(),[201,201,400]);
 assert.equal(await stock(combo),5);assert.equal(await available(netflix),1);assert.equal(await available(prime),1); // Remaining Prime row is a full account profile.
 catalog=(await request('/api/products',buyer)).data.products;assert.equal(catalog.find(p=>p.id===combo.id).stock,0);assert.equal(catalog.find(p=>p.id===combo.id).configuredStock,5);
 assert.equal(await available(wrong),2);assert.equal(await available(fullNetflix),2);assert.equal(await available(fullPrime),2);
 // Editing a depleted bundle can set its configured quantity to ten without entering credentials.
 const updated=await request(`/api/products/${combo.id}`,admin,'PATCH',{name:combo.name,category:'Combos',price:15000,stock:10,expectedStock:0,expectedConfiguredStock:5,description:'',mark:'Combo',active:true});assert.equal(updated.status,200,JSON.stringify(updated));assert.equal(await stock(combo),10);assert.equal(updated.data.product.stock,0);assert.equal(updated.data.product.configuredStock,10);
 const stale=await request(`/api/products/${combo.id}`,admin,'PATCH',{name:combo.name,category:'Combos',price:15000,stock:99,expectedStock:0,expectedConfiguredStock:5,active:true});assert.equal(stale.status,409);
 const capped=await product('Combo x2: Netflix + Prime Video',{category:'Combos',stock:1,price:15000});
 for(let i=0;i<3;i++){await access(netflix);await access(prime);}
 assert.equal((await buy(buyer,[{id:capped.id,qty:2}])).status,400);
 const capRace=await Promise.all([buy(buyer,[{id:capped.id,qty:1}]),buy(other,[{id:capped.id,qty:1}])]);assert.deepEqual(capRace.map(r=>r.status).sort(),[201,400]);
 assert.equal(await stock(capped),0);assert.equal((await request('/api/products',buyer)).data.products.find(p=>p.id===capped.id).stock,0);
 console.log('PASS combo inventory: configured quantity 10/no combo credentials, derived availability, 2/3-platform orders, qty2, mixed carts, immutable receipts, shared individual stock, full-account/33-day exclusions, seller isolation, idempotency, concurrent purchases, rollback and admin stock editing.');
}finally{
 const ids=users.map(u=>u.id),pids=products.map(p=>p.id);await db.streamingAccess.deleteMany({where:{productId:{in:pids}}});await db.orderItem.deleteMany({where:{order:{userId:{in:ids}}}});await db.order.deleteMany({where:{userId:{in:ids}}});await db.walletEvent.deleteMany({where:{userId:{in:ids}}});await db.product.deleteMany({where:{id:{in:pids}}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();
}

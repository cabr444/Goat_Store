import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { decryptPrivate, encryptPrivate, receiptText } from '../lib/private-delivery.ts';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid'), base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3103');
if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!='/goat_inventory_test'||!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use only the isolated local inventory database/server');
if(!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32)throw Error('Test server AUTH_SECRET required');
const db=new PrismaClient(),users=[],products=[],suffix=randomUUID();
async function request(path,cookie,method='GET',body){const res=await fetch(base.origin+path,{method,headers:{Cookie:'goat_session='+cookie,Origin:base.origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});return {status:res.status,data:await res.json()};}
async function createUser(role,balance=1000000){const u=await db.user.create({data:{name:'Inventory '+role,email:`${role}-${users.length}-${suffix}@example.com`,role,balance,passwordHash:'fixture'}});users.push(u);return { ...u,token:await new SignJWT({uid:u.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET)) };}
async function product(name,extra={}){const p=await db.product.create({data:{name,category:'Streaming',price:1000,stock:99,...extra}});products.push(p);return p;}
const delivery=profile=>({brand:'STREAMING LT',email:`shared-${suffix}@example.com`,password:'OriginalSecret',profile:String(profile),pin:'1234'});
const endpoint=p=>`/api/admin/products/${p.id}/inventory`;
try{
 const admin=await createUser('ADMIN'),buyer=await createUser('CLIENTE'),other=await createUser('CLIENTE'),seller=await createUser('VENDEDOR'),poor=await createUser('CLIENTE',0);
 const a=await product('Netflix x33 días '+suffix),b=await product('Netflix x28 días '+suffix),legacy=await product('Netflix legacy '+suffix,{deliveryCipher:encryptPrivate(JSON.stringify(delivery('legacy')))});
 const add=(p,profile,overrides={})=>request(endpoint(p),admin.token,'POST',{platform:'Netflix',delivery:delivery(profile),...overrides});
 assert.equal((await request(endpoint(a),buyer.token)).status,403);
 assert.equal((await request(endpoint(a),seller.token,'POST',{platform:'Netflix',delivery:delivery('x')})).status,403);
 assert.equal((await add(a,1)).status,201);assert.equal((await add(a,2)).status,201);assert.equal((await add(a,3)).status,201);
 assert.equal((await add(b,1,{platform:'NETFLIX x28 días',delivery:{...delivery(1),password:'DifferentPassword',pin:'9999'}})).status,409);
 assert.equal((await add(b,4)).status,201);assert.equal((await add(b,5)).status,201);
 const catalog=await request('/api/products',buyer.token);
 assert.equal(catalog.data.products.find(p=>p.id===a.id).stock,3);assert.equal(catalog.data.products.find(p=>p.id===legacy.id).stock,0);
 assert.ok(!JSON.stringify(catalog.data).includes('OriginalSecret'));assert.ok(!JSON.stringify(catalog.data).includes('fingerprint'));assert.ok(!JSON.stringify(catalog.data).includes('_count'));
 assert.equal((await request(`/api/admin/products/${a.id}/delivery`,admin.token,'PUT',delivery('old'))).status,409);
 const items=[{id:a.id,qty:2},{id:b.id,qty:1}],key=randomUUID();
 const buy=(token,lines=items,k=randomUUID())=>request('/api/orders',token,'POST',{items:lines,checkoutKey:k});
 const first=await buy(buyer.token,items,key);assert.equal(first.status,201,JSON.stringify(first.data));
 const order=await db.order.findUniqueOrThrow({where:{id:first.data.orderId},include:{items:true}});
 assert.equal(order.total,3000);assert.equal(order.status,'ENTREGADO');assert.equal(order.items.length,2);
 const snapshots=order.items.map(i=>decryptPrivate(i.receiptCipher));
 const two=snapshots.find(s=>s.includes('Acceso 1 de 2'));assert.ok(two);assert.match(two,/Perfil: 1/);assert.match(two,/Perfil: 2/);assert.ok(snapshots.some(s=>s.includes('Perfil: 4')));
 const assigned=await db.streamingAccess.findMany({where:{orderItemId:{in:order.items.map(i=>i.id)}}});assert.equal(assigned.length,3);assert.ok(assigned.every(row=>row.soldAt));assert.equal(new Set(assigned.map(row=>row.fingerprint)).size,3);
 assert.equal((await buy(buyer.token,items,key)).status,200);assert.equal((await buy(other.token,items,key)).status,409);
 assert.equal(await db.walletEvent.count({where:{userId:buyer.id}}),1);
 const own=await fetch(base.origin+'/pedidos?pedido='+order.id,{headers:{Cookie:'goat_session='+buyer.token}});assert.ok((await own.text()).includes('OriginalSecret'));
 const otherResponse=await fetch(base.origin+'/pedidos?pedido='+order.id,{headers:{Cookie:'goat_session='+other.token}});assert.ok(!(await otherResponse.text()).includes('OriginalSecret'));
 const sold=assigned[0];assert.equal((await request(endpoint({id:sold.productId}),admin.token,'PATCH',{accessId:sold.id,version:sold.version,platform:'Netflix',delivery:delivery('1')})).status,409);
 assert.equal((await add(b,1)).status,409);
 const race=await Promise.all([buy(buyer.token,[{id:a.id,qty:1}]),buy(other.token,[{id:a.id,qty:1}])]);assert.deepEqual(race.map(r=>r.status).sort(),[201,400]);
 assert.equal(await db.streamingAccess.count({where:{productId:a.id,soldAt:null,retiredAt:null}}),0);
 const pending=(await request(endpoint(b),admin.token)).data.accesses[0];assert.equal(pending.delivery.profile,'5');
 const changed=await request(endpoint(b),admin.token,'PATCH',{accessId:pending.id,version:pending.version,platform:'Netflix',delivery:{...pending.delivery,password:'UpdatedSecret',pin:'5555'}});assert.equal(changed.status,200);
 assert.equal((await request(endpoint(b),admin.token,'PATCH',{accessId:pending.id,version:pending.version,platform:'Netflix',delivery:pending.delivery})).status,409);
 const ready=await db.streamingAccess.findUniqueOrThrow({where:{id:pending.id}});
 const before=(await db.user.findUniqueOrThrow({where:{id:buyer.id}})).balance;
 assert.equal((await buy(buyer.token,[{id:b.id,qty:1},{id:legacy.id,qty:1}])).status,400);
 assert.equal((await db.user.findUniqueOrThrow({where:{id:buyer.id}})).balance,before);
 assert.equal((await buy(poor.token,[{id:b.id,qty:1}])).status,400);
 assert.equal((await db.streamingAccess.findUniqueOrThrow({where:{id:pending.id}})).soldAt,null);
 assert.equal((await db.product.findUniqueOrThrow({where:{id:b.id}})).stock,1);
 assert.equal((await request(endpoint(b),admin.token,'DELETE',{accessId:pending.id,version:ready.version})).status,200);
 assert.equal((await add(b,5)).status,409);
 const past=delivery('historic');
 await db.order.create({data:{userId:buyer.id,total:1000,items:{create:{productId:legacy.id,name:legacy.name,category:'Streaming',quantity:1,unitPrice:1000,receiptCipher:encryptPrivate(receiptText(past,legacy.name,'historic',new Date(),1,1000))}}}});
 assert.equal((await add(legacy,'historic')).status,409);
 assert.equal((await db.orderItem.findUniqueOrThrow({where:{id:order.items.find(i=>i.productId===a.id).id}})).receiptCipher,order.items.find(i=>i.productId===a.id).receiptCipher);
 console.log('PASS streaming inventory: admin-only encrypted entries, cross-plan duplicate prevention, quantity-specific receipts, one-time concurrent allocation, retry recovery, buyer privacy, immutable sold entries, retirement, historic-sale protection and transaction rollback.');
}finally{
 const ids=users.map(u=>u.id),pids=products.map(p=>p.id);
 await db.streamingAccess.deleteMany({where:{productId:{in:pids}}});await db.orderItem.deleteMany({where:{order:{userId:{in:ids}}}});await db.order.deleteMany({where:{userId:{in:ids}}});await db.walletEvent.deleteMany({where:{userId:{in:ids}}});await db.product.deleteMany({where:{id:{in:pids}}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();
}

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { encryptPrivate } from '../lib/private-delivery.ts';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid');
const base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3103');
if (!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!='/goat_inventory_test'||!['localhost','127.0.0.1'].includes(base.hostname)) throw Error('Isolated local test database required');
const db=new PrismaClient(), suffix=randomUUID();
let user; const products=[];
try {
 user=await db.user.create({data:{name:'Multi buyer',email:`multi-${suffix}@example.com`,passwordHash:'fixture',role:'CLIENTE',balance:100000}});
 const token=await new SignJWT({uid:user.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET));
 const cipher=encryptPrivate(JSON.stringify({brand:'STREAMING LT',email:'fixture@example.com',password:'fixture',profile:'1',pin:'1234'}));
 for (const [name,price] of [['A',13000],['B',7000]]) products.push(await db.product.create({data:{name:`Multi ${name} ${suffix}`,category:'Streaming',price,stock:10,deliveryCipher:cipher}}));
 const buy=async(items,key)=>{const res=await fetch(base.origin+'/api/orders',{method:'POST',headers:{Cookie:'goat_session='+token,Origin:base.origin,'Content-Type':'application/json'},body:JSON.stringify({items,checkoutKey:key})});return {status:res.status,data:await res.json()};};
 const items=products.map((p,i)=>({id:p.id,qty:i+1})),key=randomUUID();
 const first=await buy(items,key); assert.equal(first.status,201,JSON.stringify(first.data));
 const replay=await buy([...items].reverse(),key); assert.equal(replay.status,200); assert.equal(replay.data.orderId,first.data.orderId);
 const order=await db.order.findUnique({where:{id:first.data.orderId},include:{items:true}});
 assert.equal(order.userId,user.id); assert.equal(order.total,27000); assert.equal(order.items.length,2); assert.ok(order.items.every(i=>i.receiptCipher));
 assert.equal((await db.user.findUnique({where:{id:user.id}})).balance,73000);
 assert.equal(await db.walletEvent.count({where:{userId:user.id}}),1);
 assert.equal((await buy([{id:products[0].id,qty:1}],key)).status,409);
 const concurrentKey=randomUUID();const pair=await Promise.all([buy(items,concurrentKey),buy(items,concurrentKey)]);
 assert.deepEqual(pair.map(p=>p.status).sort(),[200,201]);assert.equal(pair[0].data.orderId,pair[1].data.orderId);
 const before=await db.user.findUnique({where:{id:user.id}});
 assert.equal((await buy([{id:products[0].id,qty:50},{id:products[1].id,qty:1}],randomUUID())).status,400);
 assert.equal((await db.user.findUnique({where:{id:user.id}})).balance,before.balance);
 assert.equal(await db.order.count({where:{userId:user.id}}),2);
 assert.equal(await db.walletEvent.count({where:{userId:user.id}}),2);
 assert.deepEqual((await db.product.findMany({where:{id:{in:products.map(p=>p.id)}},orderBy:{name:'asc'}})).map(p=>p.stock),[8,6]);
 console.log('PASS: client multi-item purchase, private receipts, database persistence, concurrent retry protection and atomic failure.');
} finally {
 if(user){await db.orderItem.deleteMany({where:{order:{userId:user.id}}});await db.order.deleteMany({where:{userId:user.id}});await db.walletEvent.deleteMany({where:{userId:user.id}});await db.user.delete({where:{id:user.id}});}
 await db.product.deleteMany({where:{id:{in:products.map(p=>p.id)}}});await db.$disconnect();
}

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { courseProducts } from '../lib/course-products.ts';
const url=new URL(process.env.DATABASE_URL||'postgresql://invalid');
const base=new URL(process.env.COURSES_TEST_URL||'http://127.0.0.1:3110');
if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!='/goat_inventory_test'||!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Isolated local test database required');
const db=new PrismaClient(), users=[], ids=courseProducts.map(p=>p.id);
const tokens=[];
async function request(path,token,body){const r=await fetch(base.origin+path,{method:body?'POST':'GET',headers:{Cookie:'goat_session='+token,Origin:base.origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,redirect:'manual'});return {status:r.status,data:r.headers.get('content-type')?.includes('json')?await r.json():await r.text()};}
try{
 assert.equal(await db.product.count({where:{id:{in:ids}}}),0,'Use a fresh local database');
 for(const role of ['ADMIN','CLIENTE','VENDEDOR']){
  const user=await db.user.create({data:{name:'Course '+role,email:`course-${randomUUID()}@example.com`,passwordHash:'fixture',role,balance:500000}});users.push(user);
  tokens.push(await new SignJWT({uid:user.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET)));
 }
 assert.equal((await request('/cursos','')).status,200);
 for(const token of ['',tokens[1],tokens[2]])assert.equal((await request('/api/admin/courses/seed',token,{})).status,403);
 const seed=await request('/api/admin/courses/seed',tokens[0],{});assert.equal(seed.status,200,JSON.stringify(seed));assert.equal(seed.data.added,courseProducts.length);
 await db.product.update({where:{id:ids[1]},data:{name:'Diseño digital con Canva',price:22222}});
 const migration=await request('/api/admin/courses/seed',tokens[0],{});assert.equal(migration.data.updated,1);assert.equal((await db.product.findUniqueOrThrow({where:{id:ids[1]}})).price,22222);
 await db.product.update({where:{id:ids[0]},data:{name:'Edited course',price:12345,stock:1}});
 assert.equal((await request('/api/admin/courses/seed',tokens[0],{})).data.added,0);
 assert.equal((await db.product.findUniqueOrThrow({where:{id:ids[0]}})).price,12345);
 const page=await request('/cursos',tokens[1]);assert.equal(page.status,200);assert.ok(page.data.includes('Tu próxima habilidad'));
 const buy=await request('/api/orders',tokens[1],{items:[{id:ids[0],qty:1}]});assert.equal(buy.status,201,JSON.stringify(buy));
 const order=await db.order.findFirstOrThrow({where:{userId:users[1].id},include:{items:true}});assert.equal(order.total,12345);assert.equal(order.status,'PENDIENTE_ENTREGA');assert.equal(order.items[0].category,'Cursos');
 assert.equal((await db.user.findUniqueOrThrow({where:{id:users[1].id}})).balance,487655);
 assert.equal((await db.product.findUniqueOrThrow({where:{id:ids[0]}})).stock,0);
 const orders=await request('/pedidos?tipo=cursos',tokens[1]);assert.equal(orders.status,200);assert.ok(orders.data.includes('Edited course'));
 console.log('PASS courses: authenticated page, admin-only/idempotent sample loader, preserved edits, client purchase, saved course order, manual delivery, balance and stock.');
}finally{
 const userIds=users.map(u=>u.id);const orders=await db.order.findMany({where:{userId:{in:userIds}},select:{id:true}});const orderIds=orders.map(o=>o.id);
 await db.checkoutAttempt.deleteMany({where:{orderId:{in:orderIds}}});await db.orderItem.deleteMany({where:{orderId:{in:orderIds}}});await db.order.deleteMany({where:{id:{in:orderIds}}});await db.walletEvent.deleteMany({where:{userId:{in:userIds}}});await db.product.deleteMany({where:{id:{in:ids}}});await db.user.deleteMany({where:{id:{in:userIds}}});await db.$disconnect();
}

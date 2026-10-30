import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { encryptPrivate } from '../lib/private-delivery.ts';
import { getAdminClients } from '../lib/admin-clients.ts';
import { getAdminSales } from '../lib/admin-sales.ts';
import { db as sharedDb } from '../lib/db.ts';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid'),base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3125');
if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!='/goat_inventory_test'||!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use only isolated local database/server');
const db=new PrismaClient(),suffix=randomUUID(),users=[],products=[],orders=[];
async function request(path,token='',method='GET',body,origin=base.origin){return fetch(base.origin+path,{method,headers:{Cookie:'goat_session='+token,Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
try{
 for(const role of ['ADMIN','CLIENTE','VENDEDOR'])users.push(await db.user.create({data:{name:role==='CLIENTE'?'=DANGEROUS()':'Sales '+role,email:`sales-${role}-${suffix}@example.com`,passwordHash:'HiddenPasswordHash',role,balance:98765}}));
 const [admin,client,seller]=await Promise.all(users.map(user=>new SignJWT({uid:user.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET))));
 for(const category of ['Audio','Cursos'])products.push(await db.product.create({data:{name:'Sales fixture '+category+' '+suffix,category,ownerId:users[0].id,price:category==='Audio'?1200:3400,stock:25,deliveryCipher:'HiddenProductCipher'}}));
 for(const [date,status,lines] of [
 ['2026-10-24T05:00:00Z','PENDIENTE_ENTREGA',[[0,2],[1,1]]],
 ['2026-10-25T04:59:59Z','ENTREGADO',[[1,3]]],
 ['2026-10-24T04:59:59Z','ENTREGADO',[[0,1]]],
 ['2026-10-25T05:00:00Z','ENTREGADO',[[0,1]]],
 ])orders.push(await db.order.create({data:{userId:users[1].id,reference:'AS-'+randomUUID(),createdAt:new Date(date),status,total:lines.reduce((sum,[index,qty])=>sum+products[index].price*qty,0),items:{create:lines.map(([index,quantity])=>({productId:products[index].id,name:products[index].name,category:products[index].category,quantity,unitPrice:products[index].price,receiptCipher:encryptPrivate('PrivateAdminReceipt '+suffix)}))}}}));
 const raw={q:suffix,desde:'2026-10-24',hasta:'2026-10-24'};
 const summary=await getAdminSales(raw);assert.equal(summary.count,2);assert.equal(summary.salesCount,2);assert.equal(summary.total,16000);assert.equal(summary.units,6);assert.equal(summary.pending,1);
 assert.equal((await getAdminSales({...raw,categoria:'Cursos'})).count,2);assert.equal((await getAdminSales({...raw,estado:'ENTREGADO'})).total,10200);
 const query=new URLSearchParams(raw),paths=['/administracion/ventas?'+query,'/administracion/clientes','/administracion/ventas/'+orders[0].id];
 for(const path of paths){assert.equal((await request(path)).status,307);for(const token of [client,seller]){const denied=await request(path,token);assert.equal(denied.status,307);assert.equal(denied.headers.get('location'),'/perfil');assert.ok(!(await denied.text()).includes('PrivateAdminReceipt'));}}
 for(const token of ['',client,seller]){assert.equal((await request('/api/admin/sales/export',token)).status,403);assert.equal((await request('/api/admin/orders/'+orders[0].id+'/status',token,'PATCH',{expectedStatus:'PENDIENTE_ENTREGA',status:'ENTREGADO'})).status,403);}
 const dashboard=await request(paths[0],admin);assert.equal(dashboard.status,200);const html=await dashboard.text();assert.ok(html.includes(users[1].email));assert.ok(html.includes('Historial de ventas'));assert.ok(!html.includes('PrivateAdminReceipt'));assert.ok(!html.includes('HiddenPasswordHash'));
 const detail=await request('/administracion/ventas/'+orders[0].id,admin);assert.equal(detail.status,200);assert.ok((await detail.text()).includes('PrivateAdminReceipt'));
 const csv=await request('/api/admin/sales/export?'+query,admin);assert.equal(csv.status,200);assert.ok(csv.headers.get('content-type').includes('text/csv'));const text=await csv.text();assert.equal(text.trim().split('\r\n').length,4);assert.ok(text.includes("'=DANGEROUS()"));assert.ok(!text.includes('PrivateAdminReceipt'));assert.ok(!text.includes('HiddenProductCipher'));assert.ok(!text.includes('HiddenPasswordHash'));
 const change='/api/admin/orders/'+orders[0].id+'/status',payload={expectedStatus:'PENDIENTE_ENTREGA',status:'ENTREGADO'};
 assert.equal((await request(change,admin,'PATCH',payload,'https://attacker.example')).status,403);assert.equal((await request(change,admin,'PATCH',{...payload,status:'CANCELADO'})).status,400);
 const race=await Promise.all([request(change,admin,'PATCH',payload),request(change,admin,'PATCH',payload)]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 assert.equal((await db.order.findUniqueOrThrow({where:{id:orders[0].id}})).status,'ENTREGADO');assert.equal((await db.user.findUniqueOrThrow({where:{id:users[1].id}})).balance,98765);assert.equal((await db.product.findUniqueOrThrow({where:{id:products[0].id}})).stock,25);assert.equal(await db.walletEvent.count({where:{userId:users[1].id}}),0);
 const clients=await request('/administracion/clientes?q='+encodeURIComponent(users[1].email),admin);assert.equal(clients.status,200);const clientHtml=await clients.text();assert.ok(clientHtml.includes(users[1].email));assert.ok(!clientHtml.includes('HiddenPasswordHash'));assert.ok(clientHtml.includes('Recargar saldo'));
 for(let index=0;index<22;index++)orders.push(await db.order.create({data:{userId:users[1].id,total:1200,createdAt:new Date('2026-01-01T00:00:00Z'),items:{create:{productId:products[0].id,name:products[0].name,category:'Audio',quantity:1,unitPrice:1200}}}}));
 const page=await getAdminSales({q:suffix,pagina:'999999'});assert.equal(page.page,2);assert.equal(page.orders.length,6);assert.equal(page.count,26);
 // Administrator purchases remain in history/CSV, but never contribute to any KPI.
 const beforeAdmin = await getAdminSales({q:suffix});
 const adminOrder = await db.order.create({data:{userId:users[0].id,total:999000,status:'PENDIENTE_ENTREGA',createdAt:new Date('2026-10-24T12:00:00Z'),items:{create:{productId:products[0].id,name:products[0].name,category:'Audio',quantity:99,unitPrice:1000}}}});orders.push(adminOrder);
 const afterAdmin = await getAdminSales({q:suffix});
 assert.equal(afterAdmin.count,beforeAdmin.count+1);
 for(const key of ['salesCount','total','units','pending'])assert.equal(afterAdmin[key],beforeAdmin[key]);
 const adminOnly = await getAdminSales({q:users[0].email});
 assert.equal(adminOnly.count,1);assert.equal(adminOnly.orders[0].id,adminOrder.id);
 for(const key of ['salesCount','total','units','pending'])assert.equal(adminOnly[key],0);
 const adminCSV=await request('/api/admin/sales/export?q='+encodeURIComponent(users[0].email),admin);
 assert.equal(adminCSV.status,200);assert.ok((await adminCSV.text()).includes(users[0].email));
 const filteredAdmin=await getAdminSales({...raw,estado:'PENDIENTE_ENTREGA',categoria:'Audio'});
 assert.equal(filteredAdmin.count,1);assert.equal(filteredAdmin.salesCount,0);assert.equal(filteredAdmin.total,0);assert.equal(filteredAdmin.units,0);assert.equal(filteredAdmin.pending,0);
 // Spending ranges/sort must apply before pagination and include zero spenders.
 const zeroSpend = await getAdminClients({q:suffix,minimo:'0',maximo:'0'});
 assert.equal(zeroSpend.clients.some(row=>row.id===users[2].id),true);
 assert.equal(zeroSpend.clients.some(row=>row.id===users[1].id),false);
 for(let index=1;index<=26;index++){
  const buyer=await db.user.create({data:{name:'Spending '+index,email:`spending-${index}-${suffix}@example.com`,passwordHash:'fixture',role:'CLIENTE'}});users.push(buyer);
  orders.push(await db.order.create({data:{userId:buyer.id,total:index*1000,items:{create:{productId:products[0].id,name:products[0].name,category:'Audio',quantity:1,unitPrice:index*1000}}}}));
 }
 const spendRaw={q:'spending-',minimo:'1000',maximo:'26000',orden:'mayor'};
 const spendFirst=await getAdminClients(spendRaw),spendSecond=await getAdminClients({...spendRaw,pagina:'2'});
 assert.equal(spendFirst.count,26);assert.equal(spendFirst.clients.length,25);assert.equal(spendFirst.clients[0].totalSpent,26000);
 assert.equal(spendSecond.clients.length,1);assert.equal(spendSecond.clients[0].totalSpent,1000);
 const ascending=await getAdminClients({...spendRaw,orden:'menor'});assert.equal(ascending.clients[0].totalSpent,1000);
 const exactSpend=await getAdminClients({...spendRaw,minimo:'12000',maximo:'12000'});assert.equal(exactSpend.count,1);assert.equal(exactSpend.clients[0].totalSpent,12000);
 const invalidSpend=await getAdminClients({...spendRaw,minimo:'20000',maximo:'1000'});assert.equal(invalidSpend.filters.invalidRange,true);assert.equal(invalidSpend.count,0);
 const spendPage=await request('/administracion/clientes?'+new URLSearchParams({...spendRaw,pagina:'2'}),admin);assert.equal(spendPage.status,200);const spendHTML=await spendPage.text();assert.ok(spendHTML.includes('Gasto mínimo (COP)'));assert.ok(spendHTML.includes('Mayor gasto primero'));assert.ok(spendHTML.includes('minimo=1000'));
 console.log('PASS admin sales: administrator buyers excluded from all KPIs with history/CSV retained, customer purchases of admin-owned products counted, role/origin protection, exact Bogotá date range, complete-order totals and category/status filters, buyer details, private receipts restricted to admin detail, safe CSV, pagination, clients, delivery status concurrency with balance/stock/ledger unchanged.');
}finally{
 await db.orderItem.deleteMany({where:{orderId:{in:orders.map(o=>o.id)}}});await db.order.deleteMany({where:{id:{in:orders.map(o=>o.id)}}});await db.walletEvent.deleteMany({where:{userId:{in:users.map(u=>u.id)}}});await db.product.deleteMany({where:{id:{in:products.map(p=>p.id)}}});await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await db.$disconnect();await sharedDb.$disconnect();
}

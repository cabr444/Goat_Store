import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid'),base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3116');
if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!='/goat_inventory_test'||!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use only the isolated local test database/server');
const db=new PrismaClient(),products=[];let settings,banner,user,order;
async function request(path,method='GET',body){const r=await fetch(base.origin+path,{method,headers:{Origin:base.origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});return r;}
try{
 settings=await db.storeSettings.findUnique({where:{id:'main'}});await db.storeSettings.upsert({where:{id:'main'},create:{tiendaEnabled:true,segundaEnabled:true},update:{tiendaEnabled:true,segundaEnabled:true}});
 user=await db.user.create({data:{name:'Private Guest Fixture',email:`private-${randomUUID()}@example.com`,passwordHash:'NotPublic',balance:98765}});
 for(const category of ['Streaming','Audio','Ropa usada','Cursos'])products.push(await db.product.create({data:{name:'Guest '+category,category,price:1000,stock:3,deliveryCipher:'DoNotExposePrivateCipher'}}));
 order=await db.order.create({data:{userId:user.id,total:1000,items:{create:{productId:products[3].id,name:'Private history',category:'Cursos',unitPrice:1000,quantity:1}}}});
 for(const path of ['/','/catalogo?categoria=Streaming','/store','/segunda','/cursos'])assert.equal((await request(path)).status,200,path);
 const storefront=await (await request('/api/storefront')).json();assert.equal(storefront.user,null);assert.deepEqual(storefront.users,[]);assert.deepEqual(storefront.orders,[]);assert.ok(storefront.products.some(p=>p.id===products[3].id));
 const serialized=JSON.stringify(storefront);for(const secret of ['NotPublic',user.email,'98765','Private history','DoNotExposePrivateCipher','receiptCipher','deliveryCipher'])assert.ok(!serialized.includes(secret),secret);
 assert.equal((await request('/api/products')).status,200);
 for(const path of ['/perfil','/pedidos','/administracion'])assert.equal((await request(path)).status,307,path);
 assert.equal((await request('/api/orders')).status,401);assert.equal((await request('/api/orders','POST',{items:[{id:products[3].id,qty:1}]})).status,401);assert.equal((await request('/api/products','POST',{})).status,401);assert.equal((await request('/api/admin/courses/seed','POST',{})).status,403);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJz0AAAAASUVORK5CYII=','base64'),imageKey='product:'+products[3].id;
 await db.catalogImageAsset.create({data:{key:imageKey,contentType:'image/png',data:png}});
 banner=await db.bannerImage.findUnique({where:{slot:6}});await db.bannerImage.upsert({where:{slot:6},create:{slot:6,data:png,contentType:'image/png'},update:{data:png,contentType:'image/png'}});
 for(const path of ['/api/catalog-images','/api/banners'])assert.equal((await request(path)).status,200,path);
 for(const path of ['/api/catalog-images/file?key='+encodeURIComponent(imageKey),'/api/banners/6']){const image=await request(path);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);}
 await db.storeSettings.update({where:{id:'main'},data:{tiendaEnabled:false,segundaEnabled:false}});
 const disabled=await (await request('/api/products')).json();assert.ok(disabled.products.every(p=>!['Audio','Ropa usada'].includes(p.category)));
 for(const path of ['/store','/segunda'])assert.equal((await request(path)).status,307);
 assert.equal((await db.user.findUniqueOrThrow({where:{id:user.id}})).balance,98765);assert.equal((await db.product.findUniqueOrThrow({where:{id:products[3].id}})).stock,3);
 console.log('PASS guest access: all public storefront pages/catalog/images, no customer/order/credential leaks, protected checkout/admin/profile/orders, disabled departments, unchanged balance and stock.');
}finally{
 if(order){await db.orderItem.deleteMany({where:{orderId:order.id}});await db.order.delete({where:{id:order.id}});}await db.catalogImageAsset.deleteMany({where:{key:{in:products.map(p=>'product:'+p.id)}}});await db.product.deleteMany({where:{id:{in:products.map(p=>p.id)}}});if(user)await db.user.delete({where:{id:user.id}});
 if(settings)await db.storeSettings.update({where:{id:'main'},data:{tiendaEnabled:settings.tiendaEnabled,segundaEnabled:settings.segundaEnabled}});else await db.storeSettings.deleteMany({where:{id:'main'}});
 if(banner)await db.bannerImage.upsert({where:{slot:6},create:banner,update:banner});else await db.bannerImage.deleteMany({where:{slot:6}});await db.$disconnect();
}

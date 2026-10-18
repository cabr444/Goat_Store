import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { encryptPrivate } from '../lib/private-delivery.ts';
import { accessFingerprint } from '../lib/streaming-inventory.ts';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid'),base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3103');
if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!='/goat_inventory_test'||!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use only the isolated local inventory test database and server');
if(!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32)throw Error('Matching local test AUTH_SECRET required');
const db=new PrismaClient(),suffix=randomUUID(),users=[],products=[];
let trigger=false;
async function request(id,cookie,origin=base.origin){const response=await fetch(base.origin+'/api/products/'+id+'/duplicate',{method:'POST',headers:{Cookie:'goat_session='+cookie,Origin:origin,'Content-Type':'application/json'},body:'{}'});return {status:response.status,data:await response.json()};}
try{
 for(const role of ['ADMIN','VENDEDOR','VENDEDOR','CLIENTE'])users.push(await db.user.create({data:{name:'Duplicate '+role,email:`duplicate-${users.length}-${suffix}@example.com`,passwordHash:'fixture',role}}));
 const [admin,seller,other,client]=await Promise.all(users.map(user=>new SignJWT({uid:user.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET))));
 const delivery={brand:'Fixture',email:'private-duplicate@example.com',password:'NeverCopyCredentials',profile:'1',pin:'1234'};
 const source=await db.product.create({data:{name:'Netflix '+suffix,category:'Streaming',price:12000,stock:8,description:'Source description',mark:'N',gradient:'linear-gradient(90deg,#111,#999)',ownerId:users[1].id,deliveryCipher:encryptPrivate(JSON.stringify(delivery))}});products.push(source.id);
 await db.streamingAccess.create({data:{productId:source.id,platform:'netflix',fingerprint:accessFingerprint('netflix',delivery),cipher:encryptPrivate(JSON.stringify(delivery))}});
 const bytes=Uint8Array.from([137,80,78,71,13,10,26,10,42]);await db.catalogImageAsset.create({data:{key:'product:'+source.id,data:bytes,contentType:'image/png'}});
 const before=await db.product.findUniqueOrThrow({where:{id:source.id}});
 assert.equal((await request(source.id,'')).status,401);assert.equal((await request(source.id,client)).status,403);assert.equal((await request(source.id,other)).status,403);assert.equal((await request('missing-fixture',admin)).status,404);assert.equal((await request(source.id,admin,'https://attacker.example')).status,403);
 const copy=await request(source.id,admin);assert.equal(copy.status,201,JSON.stringify(copy.data));products.push(copy.data.product.id);
 const saved=await db.product.findUniqueOrThrow({where:{id:copy.data.product.id}});
 assert.notEqual(saved.id,source.id);assert.equal(saved.name,source.name+' (copia)');assert.equal(saved.ownerId,users[0].id);assert.equal(saved.stock,0);assert.equal(saved.deliveryCipher,null);assert.equal(copy.data.product.stock,0);
 for(const key of ['price','description','category','mark','gradient'])assert.equal(saved[key],source[key]);
 assert.equal(await db.streamingAccess.count({where:{productId:saved.id}}),0);assert.equal(await db.orderItem.count({where:{productId:saved.id}}),0);
 assert.ok(!JSON.stringify(copy.data).includes('deliveryCipher'));assert.ok(!JSON.stringify(copy.data).includes('NeverCopyCredentials'));
 const image=await db.catalogImageAsset.findUniqueOrThrow({where:{key:'product:'+saved.id}});assert.deepEqual(image.data,bytes);
 await db.catalogImageAsset.update({where:{key:image.key},data:{data:Uint8Array.from([9,8,7])}});assert.deepEqual((await db.catalogImageAsset.findUniqueOrThrow({where:{key:'product:'+source.id}})).data,bytes);
 assert.deepEqual(await db.product.findUniqueOrThrow({where:{id:source.id}}),before);assert.equal(await db.streamingAccess.count({where:{productId:source.id}}),1);
 const ownCopy=await request(source.id,seller);assert.equal(ownCopy.status,201);products.push(ownCopy.data.product.id);assert.equal(ownCopy.data.product.ownerId,users[1].id);
 const long=await db.product.create({data:{name:'😀'.repeat(50),category:'Audio',price:5000,stock:20,ownerId:users[1].id}});products.push(long.id);
 const longCopy=await request(long.id,seller);assert.equal(longCopy.status,201);products.push(longCopy.data.product.id);assert.ok(longCopy.data.product.name.length<=100);assert.equal(longCopy.data.product.stock,0);
 // Image failure must roll back the new product, not leave a partial duplicate.
 await db.$executeRawUnsafe(`CREATE FUNCTION public.duplicate_image_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture image failure'; END; $$`);
 await db.$executeRawUnsafe('CREATE TRIGGER duplicate_image_failure BEFORE INSERT ON "CatalogImageAsset" FOR EACH ROW EXECUTE FUNCTION public.duplicate_image_failure()');trigger=true;
 const count=await db.product.count();assert.equal((await request(source.id,admin)).status,503);assert.equal(await db.product.count(),count);
 assert.equal(await db.walletEvent.count({where:{userId:{in:users.map(u=>u.id)}}}),0);
 console.log('PASS product duplication: role/ownership/origin checks, copied catalog/image, independent image, zero stock, no credentials/inventory/orders, unchanged source, Unicode name limits and atomic rollback.');
}finally{
 if(trigger)await db.$executeRawUnsafe('DROP TRIGGER duplicate_image_failure ON "CatalogImageAsset"');await db.$executeRawUnsafe('DROP FUNCTION IF EXISTS public.duplicate_image_failure()');
 await db.catalogImageAsset.deleteMany({where:{key:{in:products.map(id=>'product:'+id)}}});await db.streamingAccess.deleteMany({where:{productId:{in:products}}});await db.product.deleteMany({where:{id:{in:products}}});await db.user.deleteMany({where:{id:{in:users.map(u=>u.id)}}});await db.$disconnect();
}

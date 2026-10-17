import assert from 'node:assert/strict';
import { PrismaClient, Prisma } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { migrateStore, MigrationError } from '../lib/database-migration.ts';
import { encryptPrivate, decryptPrivate, receiptText } from '../lib/private-delivery.ts';
import { accessFingerprint } from '../lib/streaming-inventory.ts';
const sourceURL=process.env.MIGRATION_TEST_SOURCE_URL||'postgresql://postgres:migration-test-only@127.0.0.1:5443/goat_migration_source_test';
const targetURL=process.env.MIGRATION_TEST_TARGET_URL||'postgresql://postgres:migration-test-only@127.0.0.1:5443/goat_migration_target_test';
for(const [value,name] of [[sourceURL,'goat_migration_source_test'],[targetURL,'goat_migration_target_test']]){
 const u=new URL(value);if(!['127.0.0.1','localhost'].includes(u.hostname)||u.pathname!='/'+name)throw Error('Only disposable local migration test databases are allowed');
}
const source=new PrismaClient({datasourceUrl:sourceURL}),target=new PrismaClient({datasourceUrl:targetURL});
const secret=process.env.DELIVERY_SECRET;process.env.DELIVERY_SECRET='isolated-migration-test-secret-123456789';
const names=Prisma.dmmf.datamodel.models.map(model=>model.name),business=names.filter(name=>name!=='RateLimit');
const client=(db,name)=>db[name[0].toLowerCase()+name.slice(1)];
const snapshot=async db=>JSON.stringify(await Promise.all(names.map(async name=>[name,await client(db,name).findMany()])));
async function emptyTarget(){for(const name of business)assert.equal(await client(target,name).count(),0,name+' should stay empty');}
try{
 for(const db of [source,target])for(const name of names)assert.equal(await client(db,name).count(),0,'Fresh test databases required');
 const passwordHash=await hash('MigrationFixturePassword',4),date=new Date('2026-10-01T12:34:56.123Z');
 const owner=await source.user.create({data:{email:'migration-admin@example.com',name:'Admin fixture',role:'ADMIN',passwordHash,balance:98765,sessionVersion:4,createdAt:date}});
 const access={brand:'STREAMING LT',email:'migration-stream@example.com',password:'OriginalPrivateFixture',profile:'1',pin:'3311'};
 const product=await source.product.create({data:{name:'Netflix x33 días',category:'Streaming',price:14000,stock:1,ownerId:owner.id,deliveryCipher:encryptPrivate(JSON.stringify(access)),createdAt:date}});
 const order=await source.order.create({data:{userId:owner.id,reference:'P41',total:14000,status:'ENTREGADO',createdAt:date,items:{create:{productId:product.id,name:product.name,category:'Streaming',sellerId:owner.id,quantity:1,unitPrice:14000,receiptCipher:encryptPrivate(receiptText(access,product.name,'P41',date,1,14000))}}},include:{items:true}});
 await source.orderCounter.create({data:{id:'orders',value:2}});
 await source.walletEvent.create({data:{userId:owner.id,amount:-14000,type:'COMPRA',note:'Fixture purchase',createdAt:date}});
 await source.passwordReset.create({data:{userId:owner.id,tokenHash:'a'.repeat(64),expiresAt:new Date('2030-01-01'),createdAt:date}});
 const bytes=Uint8Array.from([137,80,78,71,13,10,26,10,0,255,42]);
 await source.bannerImage.create({data:{slot:1,data:bytes,contentType:'image/png',updatedAt:date}});
 await source.catalogImageAsset.create({data:{key:'product:'+product.id,data:bytes,contentType:'image/png',updatedAt:date}});
 await source.catalogOrder.create({data:{kind:'products',ids:[product.id],version:7}});
 await source.storeSettings.create({data:{id:'main',tiendaEnabled:false,segundaEnabled:false}});
 await source.pendingRegistration.create({data:{email:'pending@example.com',name:'Pending fixture',passwordHash,role:'VENDEDOR',tokenHash:'b'.repeat(64),statusHash:'c'.repeat(64),createdAt:date,expiresAt:new Date('2030-01-01')}});
 await source.checkoutAttempt.create({data:{key:randomUUID(),orderId:order.id}});
 for(let i=1;i<=3;i++){const delivery={...access,profile:String(i)};await source.streamingAccess.create({data:{productId:product.id,platform:'netflix',fingerprint:accessFingerprint('netflix',delivery),cipher:encryptPrivate(JSON.stringify(delivery)),createdAt:date,version:i,soldAt:i===1?date:null,retiredAt:i===3?date:null,orderItemId:i===1?order.items[0].id:null}});}
 await source.rateLimit.create({data:{key:'source-counter',count:9,expiresAt:new Date('2030-01-01')}});
 await target.rateLimit.create({data:{key:'target-counter',count:3,expiresAt:new Date('2030-01-01')}});
 const before=await snapshot(source),logs=[];
 await assert.rejects(()=>migrateStore({sourceURL,targetURL:sourceURL}),MigrationError);
 const plan=await migrateStore({sourceURL,targetURL,log:line=>logs.push(line)});assert.equal(plan.length,14);await emptyTarget();
 assert.equal((await target.rateLimit.findUnique({where:{key:'target-counter'}})).count,3);
 process.env.DELIVERY_SECRET='wrong-key-for-test-only-1234567890123456';
 await assert.rejects(()=>migrateStore({sourceURL,targetURL,apply:true}),/descifrar/);await emptyTarget();process.env.DELIVERY_SECRET='isolated-migration-test-secret-123456789';
 await target.$executeRawUnsafe(`CREATE FUNCTION public.fail_migration_order() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture insert failure'; END; $$`);
 await target.$executeRawUnsafe('CREATE TRIGGER migration_failure BEFORE INSERT ON "Order" FOR EACH ROW EXECUTE FUNCTION public.fail_migration_order()');
 await assert.rejects(()=>migrateStore({sourceURL,targetURL,apply:true}),/Falló la migración/);await emptyTarget();assert.equal(await snapshot(source),before);
 await target.$executeRawUnsafe('DROP TRIGGER migration_failure ON "Order"');await target.$executeRawUnsafe('DROP FUNCTION public.fail_migration_order()');
 await migrateStore({sourceURL,targetURL,apply:true,log:line=>logs.push(line)});
 for(const name of business){const sourceCount=await client(source,name).count();assert.equal(await client(target,name).count(),sourceCount,name);}
 assert.equal(await snapshot(source),before,'source must remain unchanged');
 const migrated=await target.user.findUniqueOrThrow({where:{id:owner.id}});assert.equal(migrated.passwordHash,passwordHash);assert.ok(await compare('MigrationFixturePassword',migrated.passwordHash));assert.equal(migrated.balance,98765);assert.equal(migrated.sessionVersion,4);assert.equal(migrated.createdAt.toISOString(),date.toISOString());
 assert.deepEqual((await target.bannerImage.findUniqueOrThrow({where:{slot:1}})).data,bytes);
 assert.deepEqual((await target.catalogOrder.findUniqueOrThrow({where:{kind:'products'}})).ids,[product.id]);
 assert.equal(decryptPrivate((await target.product.findUniqueOrThrow({where:{id:product.id}})).deliveryCipher),JSON.stringify(access));
 assert.equal(await target.streamingAccess.count({where:{orderItemId:order.items[0].id}}),1);
 assert.equal((await target.orderCounter.findUniqueOrThrow({where:{id:'orders'}})).value,41);
 assert.equal(await target.rateLimit.count(),1);assert.equal((await target.rateLimit.findFirstOrThrow()).key,'target-counter');
 assert.ok(!logs.join('\n').includes('OriginalPrivateFixture'));assert.ok(!logs.join('\n').includes('example.com'));assert.ok(!logs.join('\n').includes(passwordHash));assert.ok(!logs.join('\n').includes('postgresql://'));
 await assert.rejects(()=>migrateStore({sourceURL,targetURL,apply:true}),/ya contiene datos/);assert.equal(await snapshot(source),before);
 // An older Supabase deployment may not yet have the new inventory/checkout tables or sessionVersion.
 await target.$executeRawUnsafe('TRUNCATE '+business.map(name=>'"'+name+'"').join(', ')+' CASCADE');
 await source.$executeRawUnsafe('DROP TABLE "StreamingAccess"');await source.$executeRawUnsafe('DROP TABLE "CheckoutAttempt"');await source.$executeRawUnsafe('ALTER TABLE "User" DROP COLUMN "sessionVersion"');
 await migrateStore({sourceURL,targetURL,apply:true});
 assert.equal((await target.user.findUniqueOrThrow({where:{id:owner.id}})).sessionVersion,0);assert.equal(await target.streamingAccess.count(),0);assert.equal(await target.checkoutAttempt.count(),0);
 assert.ok(await compare('MigrationFixturePassword',(await target.user.findUniqueOrThrow({where:{id:owner.id}})).passwordHash));
 console.log('PASS: read-only source, dry run, full application records, existing password login, exact balances/dates/images/JSON/ciphers, key checks, order counter, older schemas, target refusal and complete rollback on failure.');
}finally{if(secret===undefined)delete process.env.DELIVERY_SECRET;else process.env.DELIVERY_SECRET=secret;await Promise.allSettled([source.$disconnect(),target.$disconnect()]);}

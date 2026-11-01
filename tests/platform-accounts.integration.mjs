import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import { encodePlatformAccount, decodePlatformAccount } from '../lib/platform-accounts.ts';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid'),base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3140');
if(database.hostname!=='127.0.0.1'||database.pathname!='/goat_inventory_test'||base.hostname!=='127.0.0.1')throw Error('Isolated local database/server required');
const db=new PrismaClient(),users=[],suffix=randomUUID();let renamed=false;
const email=`private-${suffix}@example.com`,firstPassword='Private original password',updatedPassword='  New Password, "quoted"  ';
async function request(path,token='',method='GET',body,origin=base.origin){return fetch(base.origin+path,{method,headers:{Cookie:'goat_session='+token,Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
try{
 for(const role of ['ADMIN','CLIENTE','VENDEDOR']){const user=await db.user.create({data:{name:'Platform '+role,email:`platform-${role}-${suffix}@example.com`,passwordHash:'fixture',role}});users.push({...user,token:await new SignJWT({uid:user.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET))});}
 const [admin,client,seller]=users,endpoint='/api/admin/platform-accounts',body={platform:'prime',email,password:firstPassword};
 for(const token of ['',client.token,seller.token]){assert.equal((await request(endpoint,token)).status,403);assert.equal((await request(endpoint,token,'POST',body)).status,403);assert.equal((await request(endpoint+'/export',token,'POST',{includePasswords:true})).status,403);assert.equal((await request('/administracion/cuentas',token)).status,307);}
 assert.equal((await request(endpoint,admin.token,'POST',body,'https://attacker.example')).status,403);
 for(const invalid of [{...body,platform:'hulu'},{...body,email:'invalid'},{...body,password:'bad\npassword'}])assert.equal((await request(endpoint,admin.token,'POST',invalid)).status,400);
 assert.equal((await request(endpoint,admin.token,'POST',body)).status,200);
 const saved=await db.adminPlatformAccount.findFirstOrThrow();assert.ok(!saved.cipher.includes(firstPassword));assert.ok(!saved.cipher.includes(email));assert.ok(!saved.fingerprint.includes(email));assert.equal(decodePlatformAccount(saved).password,firstPassword);
 assert.equal((await request(endpoint,admin.token,'POST',{...body,email:'  '+email.toUpperCase()+'  ',password:updatedPassword})).status,200);assert.equal(await db.adminPlatformAccount.count(),1);assert.equal(decodePlatformAccount(await db.adminPlatformAccount.findUniqueOrThrow({where:{id:saved.id}})).password,updatedPassword);
 for(const platform of ['youtube','netflix'])assert.equal((await request(endpoint,admin.token,'POST',{...body,platform})).status,200);
 const extras=Array.from({length:26},(_,index)=>encodePlatformAccount({platform:'youtube',email:`extra-${index}-${suffix}@example.com`,password:index===0?'=NeverExecuteFormula()':'AnotherPrivatePassword'}));await db.adminPlatformAccount.createMany({data:extras});
 const listed=await(await request(endpoint,admin.token)).json();assert.equal(listed.count,29);assert.equal(listed.accounts.length,25);assert.equal(listed.pages,2);assert.ok(!JSON.stringify(listed).includes(firstPassword));assert.ok(!JSON.stringify(listed).includes('cipher'));assert.ok(!JSON.stringify(listed).includes('fingerprint'));assert.equal((await(await request(endpoint+'?page=2',admin.token)).json()).accounts.length,4);
 const safeExport=await request(endpoint+'/export',admin.token,'POST',{includePasswords:false});assert.equal(safeExport.status,200);assert.ok(safeExport.headers.get('content-disposition').includes('attachment'));assert.ok(safeExport.headers.get('cache-control').includes('no-store'));const safeCSV=await safeExport.text();assert.equal(safeCSV.trim().split('\r\n').length,30);assert.ok(!safeCSV.includes('Contraseña'));assert.ok(!safeCSV.includes(firstPassword));assert.ok(safeCSV.includes('extra-25-'+suffix));
 const fullExport=await request(endpoint+'/export',admin.token,'POST',{includePasswords:true});const fullCSV=await fullExport.text();assert.equal(fullExport.status,200);assert.ok(fullCSV.includes('Contraseña'));assert.ok(fullCSV.includes('New Password, ""quoted""'));assert.ok(fullCSV.includes("'=NeverExecuteFormula()"));assert.ok(fullCSV.includes('Prime Video'));assert.ok(fullCSV.includes('YouTube'));assert.ok(fullCSV.includes('Netflix'));
 assert.equal((await request(endpoint+'/export',admin.token,'POST',{includePasswords:true},'https://attacker.example')).status,403);
 for(const path of ['/api/products','/api/storefront']){const data=await(await request(path)).text();assert.ok(!data.includes(email));assert.ok(!data.includes(firstPassword));}
 assert.equal(await db.product.count(),0);assert.equal(await db.order.count(),0);
 const page=await request('/administracion/cuentas',admin.token);assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('Registrar cuenta'));assert.ok(html.includes('Prime Video'));assert.ok(html.includes('Exportar todas las cuentas'));assert.ok(!html.includes(firstPassword));
 // Missing private-table activation must never break the store catalogue.
 await db.$executeRawUnsafe('ALTER TABLE "AdminPlatformAccount" RENAME TO "PrivateAccountUnavailableTest"');renamed=true;
 const missing=await request(endpoint,admin.token);assert.equal(missing.status,503);assert.equal((await missing.json()).code,'SCHEMA_UPDATE_REQUIRED');assert.equal((await request('/api/products')).status,200);assert.equal((await request('/api/storefront')).status,200);
 await db.$executeRawUnsafe('ALTER TABLE "PrivateAccountUnavailableTest" RENAME TO "AdminPlatformAccount"');renamed=false;
 console.log('PASS private platform accounts: admin/origin enforcement, three platforms, validation, encrypted email/password, normalized updates, exact password preservation, metadata-only listing, pagination, all-record CSV with optional passwords/formula shielding, no inventory or public exposure, missing-table isolation.');
}finally{if(renamed)await db.$executeRawUnsafe('ALTER TABLE "PrivateAccountUnavailableTest" RENAME TO "AdminPlatformAccount"');await db.adminPlatformAccount.deleteMany();await db.user.deleteMany({where:{id:{in:users.map(user=>user.id)}}});await db.$disconnect();}

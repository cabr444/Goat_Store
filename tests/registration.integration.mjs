import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid'),base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3103');
if(!['localhost','127.0.0.1'].includes(database.hostname)||database.pathname!='/goat_inventory_test'||!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use only the disposable local inventory test database/server');
const db=new PrismaClient(),suffix=randomUUID(),emails=[],password='local-direct-registration-123';
async function request(path,body,origin=base.origin){const response=await fetch(base.origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'manual'});return {response,data:await response.json()};}
const signup=(email,role='CLIENTE')=>request('/api/auth/register',{email:' '+email.toUpperCase()+' ',name:'Direct Signup',role,password});
try{
 const email='direct-'+suffix+'@example.com';emails.push(email);
 const registered=await signup(email);assert.equal(registered.response.status,201,JSON.stringify(registered.data));assert.equal(registered.data.pending,undefined);assert.equal(registered.data.ticket,undefined);assert.equal(registered.response.headers.has('set-cookie'),false);
 const user=await db.user.findUniqueOrThrow({where:{email}});assert.ok(await compare(password,user.passwordHash));assert.equal(user.role,'CLIENTE');assert.equal(user.balance,0);assert.equal(await db.pendingRegistration.count({where:{email}}),0);
 const login=await request('/api/auth/login',{email,password});assert.equal(login.response.status,200);assert.ok(login.response.headers.has('set-cookie'));
 assert.equal((await signup(email)).response.status,409);
 const raceEmail='race-'+suffix+'@example.com';emails.push(raceEmail);const race=await Promise.all([signup(raceEmail),signup(raceEmail)]);assert.deepEqual(race.map(r=>r.response.status).sort(),[201,409]);assert.equal(await db.user.count({where:{email:raceEmail}}),1);
 const vendor='vendor-'+suffix+'@example.com';emails.push(vendor);assert.equal((await signup(vendor,'VENDEDOR')).response.status,201);
 const admin='admin-'+suffix+'@example.com';emails.push(admin);assert.equal((await signup(admin,'ADMIN')).response.status,400);assert.equal(await db.user.count({where:{email:admin}}),0);
 const pending='pending-'+suffix+'@example.com';emails.push(pending);
 await db.pendingRegistration.create({data:{email:pending,name:'Old pending',passwordHash:await hash('old-unused-password',4),role:'CLIENTE',tokenHash:'a'.repeat(64),statusHash:'b'.repeat(64),expiresAt:new Date(Date.now()+600000)}});
 for(const path of ['verify-email','resend-verification','registration-status'])assert.equal((await request('/api/auth/'+path,{token:'a'.repeat(64),ticket:'b'.repeat(64)})).response.status,410);
 assert.equal(await db.user.count({where:{email:pending}}),0);
 assert.equal((await signup(pending)).response.status,201);
 assert.equal((await request('/api/auth/login',{email:pending,password})).response.status,200);
 assert.equal((await request('/api/auth/login',{email:pending,password:'old-unused-password'})).response.status,401);
 const foreign='foreign-'+suffix+'@example.com';emails.push(foreign);assert.equal((await request('/api/auth/register',{email:foreign,name:'Foreign',role:'CLIENTE',password},'https://attacker.example')).response.status,403);
 console.log('PASS direct registration: no email configuration needed, immediate persisted accounts, login, hashed passwords, concurrent email uniqueness, pending-flow retirement, vendor role and origin/admin protections.');
}finally{await db.pendingRegistration.deleteMany({where:{email:{in:emails}}});await db.user.deleteMany({where:{email:{in:emails}}});await db.$disconnect();}

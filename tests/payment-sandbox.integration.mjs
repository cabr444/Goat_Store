import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
const database=new URL(process.env.DATABASE_URL||'postgresql://invalid'),base=new URL(process.env.INVENTORY_TEST_URL||'http://127.0.0.1:3140');
if(database.hostname!=='127.0.0.1'||database.pathname!='/goat_inventory_test'||base.hostname!=='127.0.0.1')throw Error('Isolated local database/server required');
const db=new PrismaClient(),users=[],suffix=randomUUID();
async function request(path,token='',method='GET',body,origin=base.origin){return fetch(base.origin+path,{method,headers:{Cookie:'goat_session='+token,Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});}
try{
 for(const role of ['ADMIN','CLIENTE','VENDEDOR']){const user=await db.user.create({data:{name:'Sandbox '+role,email:`sandbox-${role}-${suffix}@example.com`,passwordHash:'fixture',role}});users.push({...user,token:await new SignJWT({uid:user.id,sv:0}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(process.env.AUTH_SECRET))});}
 const [admin,client,seller]=users;
 for(const token of ['',client.token,seller.token]){assert.equal((await request('/administracion/pruebas-pagos',token)).status,307);assert.equal((await request('/api/admin/bin-lookup',token,'POST',{bin:'424242'})).status,403);}
 assert.equal((await request('/api/admin/bin-lookup',admin.token,'POST',{bin:'424242'},'https://attacker.example')).status,403);
 for(const body of [{bin:'4242424242424242'},{bin:'424242',cvc:'123'},{bin:'424242',expiry:'12/30'},{bin:'424242',endpoint:'https://attacker.example'},{bin:['424242','400000']}])assert.equal((await request('/api/admin/bin-lookup',admin.token,'POST',body)).status,400);
 const page=await request('/administracion/pruebas-pagos',admin.token);assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('BIN y pruebas sandbox'));assert.ok(html.includes('Simulación local'));assert.ok(html.includes('docs.stripe.com/testing'));
 assert.equal(await db.order.count(),0);assert.equal(await db.walletEvent.count(),0);
 console.log('PASS sandbox permissions: admin-only page/API, cross-origin protection, full-card/security-field/custom-endpoint/bulk rejection, local-simulation labels and no financial writes. No provider or payment requests made.');
}finally{await db.user.deleteMany({where:{id:{in:users.map(user=>user.id)}}});await db.$disconnect();}

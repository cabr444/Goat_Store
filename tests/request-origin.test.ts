import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedMutationOrigin } from '../lib/request-origin';
import { validateMutation } from '../lib/security';
import { db } from '../lib/db';
import { POST as login } from '../app/api/auth/login/route';
import { readImageUpload } from '../lib/image-upload';
const keys=['APP_URL','VERCEL','VERCEL_URL','VERCEL_BRANCH_URL','VERCEL_PROJECT_PRODUCTION_URL'] as const;
test('Vercel aliases work while foreign origins, opaque origins and forged forwarding headers stay blocked', async () => {
 const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 const cleanup=db.rateLimit.deleteMany, increment=db.rateLimit.upsert;
 db.rateLimit.deleteMany=(async()=>({count:0})) as typeof cleanup;
 db.rateLimit.upsert=(async()=>({count:1})) as unknown as typeof increment;
 try {
  process.env.APP_URL='https://goat.example.com';process.env.VERCEL='1';
  process.env.VERCEL_URL='goat-deployment-team.vercel.app';
  process.env.VERCEL_BRANCH_URL='goat-git-password-reset-team.vercel.app';
  process.env.VERCEL_PROJECT_PRODUCTION_URL='goat-team.vercel.app';
  const request=(url:string,origin?:string,extra:Record<string,string>={})=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json',...(origin===undefined?{}:{Origin:origin}),...extra},body:'{}'});
  for (const origin of ['https://goat.example.com','https://goat-deployment-team.vercel.app','https://goat-git-password-reset-team.vercel.app','https://goat-team.vercel.app']) {
   // A reverse proxy can expose an internal URL to the runtime.
   assert.equal(validateMutation(request('http://localhost:3000/api/auth/login',origin,{'Sec-Fetch-Site':'same-origin'})),null);
   assert.equal(validateMutation(request(origin+'/api/auth/login',origin)),null);
   // The actual login endpoint now reaches payload validation rather than a false origin denial.
   assert.equal((await login(request('http://localhost:3000/api/auth/login',origin,{'Sec-Fetch-Site':'same-origin'}))).status,400);
  }
  const current='https://new-custom-domain.example.com';
  assert.equal(validateMutation(request(current+'/api/auth/login',current,{'Sec-Fetch-Site':'same-origin'})),null);
  for(const origin of ['https://attacker.vercel.app','https://goat-team.vercel.app.attacker.example','https://evil.example','null','https://goat-team.vercel.app/path','https://user:password@goat-team.vercel.app']) {
   assert.equal(validateMutation(request('https://goat-team.vercel.app/api/auth/login',origin,{'X-Forwarded-Host':'evil.example','X-Forwarded-Proto':'https',Host:'evil.example'}))?.status,403);
  }
  assert.equal(allowedMutationOrigin(request('https://goat-team.vercel.app/api/auth/login','https://goat-team.vercel.app',{'Sec-Fetch-Site':'cross-site'})),false);
  // Uploads use the same policy and reach format validation for legitimate aliases.
  assert.equal((await readImageUpload(request('http://localhost/api/admin/images','https://goat-team.vercel.app'))) instanceof Response,true);
  assert.equal((await readImageUpload(request('http://localhost/api/admin/images','https://goat-team.vercel.app')) as Response).status,415);
  assert.equal((await readImageUpload(request('http://localhost/api/admin/images','https://attacker.vercel.app')) as Response).status,403);
  process.env.APP_URL='invalid';
  assert.equal(allowedMutationOrigin(request(current+'/api/auth/login',current)),true);
  process.env.VERCEL='0';
  assert.equal(allowedMutationOrigin(request('http://localhost/api/auth/login','https://goat-team.vercel.app')),false);
  delete process.env.APP_URL;
  assert.equal(validateMutation(request('http://localhost:3000/api/auth/login','http://localhost:3000')),null);
  assert.equal(validateMutation(request('http://localhost:3000/api/auth/login','http://localhost:3001'))?.status,403);
 } finally { db.rateLimit.deleteMany=cleanup; db.rateLimit.upsert=increment; for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];} }
});

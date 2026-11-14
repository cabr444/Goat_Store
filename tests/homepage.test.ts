import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inicioEnabledFromSettings, homepageDestination } from '../lib/homepage';
test('existing stores default to Inicio and can switch back from Streaming',()=>{
  for(const value of [undefined,null,[],{},['unrelated']]) assert.equal(inicioEnabledFromSettings(value),true);
  assert.equal(inicioEnabledFromSettings(['streaming']),false);
  assert.equal(homepageDestination({}),'/');
  assert.equal(homepageDestination({inicioEnabled:true}),'/');
  assert.equal(homepageDestination({inicioEnabled:false}),'/catalogo?categoria=Streaming');
});

test('saved homepage selection is returned alongside independent department settings',async()=>{
  const globals=globalThis as unknown as {prisma?:unknown};const original=globals.prisma;
  let homepage:unknown=null;
  const client={storeSettings:{findUnique:async()=>({tiendaEnabled:false,segundaEnabled:true})},catalogOrder:{findUnique:async({where}:any)=>{assert.equal(where.kind,'homepage');return homepage;}}};
  globals.prisma=client;
  try{
    const {getStoreOptions}=await import('../lib/store-settings');
    assert.deepEqual(await getStoreOptions(client as any),{tiendaEnabled:false,segundaEnabled:true,inicioEnabled:true});
    homepage={ids:['streaming']};
    assert.deepEqual(await getStoreOptions(client as any),{tiendaEnabled:false,segundaEnabled:true,inicioEnabled:false});
    homepage={ids:[]};assert.equal((await getStoreOptions(client as any)).inicioEnabled,true);
  }finally{globals.prisma=original;}
});

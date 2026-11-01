import { test } from 'node:test';
import assert from 'node:assert/strict';
import { binSchema, lookupBin } from '../lib/bin-lookup';
import { sandboxCards } from '../lib/sandbox-cards';
test('BIN endpoint accepts prefixes only and rejects full-card or security data', () => {
 for(const bin of ['424242','42424242'])assert.equal(binSchema.safeParse({bin}).success,true);
 for(const bin of ['','12345','1234567','4242424242424242','424242/../','abcdef'])assert.equal(binSchema.safeParse({bin}).success,false);
 assert.equal(binSchema.safeParse({bin:'424242',cvc:'123'}).success,false);
 assert.equal(binSchema.safeParse({bin:'424242',expiry:'12/30'}).success,false);
});
test('BIN lookup uses a fixed metadata provider and returns only allowed labels',async()=>{
 const calls:unknown[]=[];
 const transport:typeof fetch=async(input,init)=>{calls.push([String(input),init]);return new Response(JSON.stringify({scheme:'visa',type:'credit',brand:'Test',country:{name:'Example country'},bank:{name:'Example bank',url:'https://untrusted.example'},cardNumber:'never-return-this',live:true}),{status:200});};
 const result=await lookupBin('424242',transport);
 assert.equal((calls[0] as unknown[])[0],'https://lookup.binlist.net/424242');
 assert.deepEqual(result,{found:true,scheme:'visa',type:'credit',brand:'Test',country:'Example country',bank:'Example bank'});
 assert.deepEqual(await lookupBin('424242',async()=>new Response(null,{status:404})),{found:false});
 await assert.rejects(lookupBin('424242',async()=>new Response(null,{status:429})),/RATE_LIMIT/);
 await assert.rejects(lookupBin('4242424242424242',transport));assert.equal(calls.length,1);
});
test('sandbox is a fixed set of published test fixtures, not an arbitrary-card checker',()=>{
 assert.equal(sandboxCards.length,4);
 assert.deepEqual(sandboxCards.map(card=>card.id),['success','decline','funds','authentication']);
 for(const card of sandboxCards)assert.ok(card.result.startsWith('Simulación:'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accessFingerprint, platformForProduct } from '../lib/streaming-inventory';
test('access identity spans plans and ignores password, PIN and cosmetic changes', () => {
 const old=process.env.DELIVERY_SECRET;process.env.DELIVERY_SECRET='isolated-test-delivery-secret-1234567890';
 try {
 const a=accessFingerprint('Netflix x33 días',{email:'Account@Example.com',profile:' 1 '});
 assert.equal(a,accessFingerprint('NETFLIX',{email:'account@example.com',profile:'1'}));
 assert.notEqual(a,accessFingerprint('Netflix',{email:'account@example.com',profile:'2'}));
 assert.notEqual(a,accessFingerprint('Prime Video',{email:'account@example.com',profile:'1'}));
 assert.equal(platformForProduct('Amazon Prime Video x30 días'),'prime');
 assert.equal(platformForProduct('HBO Max Standard'),'max');
 assert.equal(platformForProduct('Chat GPT x27 Dias'), platformForProduct('Chat GPT x20 Dias'));
 assert.equal(platformForProduct('Spotify x30 días'), 'spotify');
 assert.ok(!a.includes('account'));
 } finally { if(old===undefined)delete process.env.DELIVERY_SECRET;else process.env.DELIVERY_SECRET=old; }
});

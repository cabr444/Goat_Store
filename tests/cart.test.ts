import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeCart, cartSignature } from '../lib/cart';
import { verificationMailProblem } from '../lib/verification-mail-errors';
test('retry identity ignores row ordering and merged duplicate rows', () => {
 const rows = [{id:'b',qty:2},{id:'a',qty:1},{id:'b',qty:1}];
 assert.deepEqual(mergeCart(rows), [{id:'b',qty:3},{id:'a',qty:1}]);
 assert.equal(cartSignature(rows), cartSignature([{id:'a',qty:1},{id:'b',qty:3}]));
 assert.notEqual(cartSignature(rows), cartSignature([{id:'a',qty:2},{id:'b',qty:3}]));
 assert.equal(rows.length,3);
});
test('mail errors classify configuration without exposing provider details', () => {
 for (const [status,message,code] of [[401,'private-key','RESEND_AUTH'],[403,'You can only send testing emails to your own email','RESEND_TEST_MODE'],[403,'domain is not verified','RESEND_DOMAIN'],[429,'private-email','RESEND_LIMIT'],[503,'private-token','RESEND_UNAVAILABLE']] as const) {
 const problem=verificationMailProblem(status,'',message);
 assert.equal(problem.code,code);
 assert.ok(!JSON.stringify(problem).includes(message));
 }
});

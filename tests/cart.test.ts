import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeCart, cartSignature } from '../lib/cart';
test('retry identity ignores row ordering and merged duplicate rows', () => {
 const rows = [{id:'b',qty:2},{id:'a',qty:1},{id:'b',qty:1}];
 assert.deepEqual(mergeCart(rows), [{id:'b',qty:3},{id:'a',qty:1}]);
 assert.equal(cartSignature(rows), cartSignature([{id:'a',qty:1},{id:'b',qty:3}]));
 assert.notEqual(cartSignature(rows), cartSignature([{id:'a',qty:2},{id:'b',qty:3}]));
 assert.equal(rows.length,3);
});

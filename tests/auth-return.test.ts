import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeStoreReturn } from '../lib/auth-return';
test('authentication return links allow storefront/cart intents and reject external or private destinations', () => {
  assert.equal(safeStoreReturn('/store?carrito=1'),'/store?carrito=1');
  assert.equal(safeStoreReturn('/catalogo?categoria=Streaming&comprar=p1'),'/catalogo?categoria=Streaming&comprar=p1');
  for(const path of [undefined,'https://evil.example','//evil.example','/\\evil.example','/admin','/api/orders','/%2f%2fevil.example'])assert.equal(safeStoreReturn(path),'/');
});

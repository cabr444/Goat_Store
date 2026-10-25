import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sharedAccountSchema } from '../lib/shared-streaming-schema';
import { accessProductIds } from '../lib/shared-streaming';
const account = { brand: 'STREAMING LT', email: 'account@example.com', password: 'PrivateTestPassword' };
test('shared account accepts seven profiles and rejects ambiguous identities or duplicate plans', () => {
  const value = { productIds: ['netflix20', 'netflix28', 'netflix33'], account, profiles: Array.from({length:7}, (_,i)=>({profile:String(i+1),pin:'00'+i})) };
  assert.ok(sharedAccountSchema.safeParse(value).success);
  assert.ok(!sharedAccountSchema.safeParse({...value, profiles:[...value.profiles,{profile:'8',pin:''}]}).success);
  assert.ok(!sharedAccountSchema.safeParse({...value, profiles:[{profile:'1',pin:''},{profile:' １ ',pin:''}]}).success);
  assert.ok(!sharedAccountSchema.safeParse({...value, productIds:['netflix20','netflix20']}).success);
  assert.ok(!sharedAccountSchema.safeParse({...value, profiles:[]}).success);
});
test('a profile has one identity even if a binding repeats its primary product', () => {
  assert.deepEqual(accessProductIds({productId:'netflix20', productIds:['netflix28','netflix20','netflix28','netflix33']}), ['netflix20','netflix28','netflix33']);
});

test('pasted email whitespace is removed while passwords and PINs are preserved exactly', () => {
  const result = sharedAccountSchema.parse({ productIds:['prime'], account:{...account, email:'  account@example.com \n', password:'  keep spaces  '}, profiles:[{profile:'1',pin:'0012'}] });
  assert.equal(result.account.email,'account@example.com');
  assert.equal(result.account.password,'  keep spaces  ');
  assert.equal(result.profiles[0].pin,'0012');
});

import { sharedAccountValidationMessage } from '../lib/shared-streaming-schema';
test('shared-account validation identifies the rejected field without exposing submitted secrets', () => {
  const original = { productIds:['prime'], account, profiles:[{profile:'1',pin:'0001'}] };
  for (const [value, expected] of [
    [{...original, account:{...account,email:'one@example.com two@example.com'}}, /un solo correo/],
    [{...original, account:{...account,password:'secret\nvalue'}}, /clave de la cuenta/],
    [{...original, account:{...account,brand:''}}, /encabezado/],
    [{...original, profiles:[{profile:'1',pin:''},{profile:'1',pin:''}]}, /perfiles repetidos/],
    [{...original, profiles:[{profile:'1',pin:'x'.repeat(41)}]}, /PIN del perfil 1/],
  ] as const) {
    const result = sharedAccountSchema.safeParse(value); assert.ok(!result.success);
    const message = sharedAccountValidationMessage(result.error.issues); assert.match(message,expected); assert.ok(!message.includes('secret')); assert.ok(!message.includes('example.com'));
  }
});

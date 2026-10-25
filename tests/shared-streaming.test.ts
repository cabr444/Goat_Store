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

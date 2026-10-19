import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comboPlatforms, eligibleComboProduct, isFullAccount } from '../lib/combo-inventory';
test('combo names recognize complete platform sets and reject incomplete/unsafe bundles', () => {
  assert.deepEqual(comboPlatforms('Combo x2: Netflix + Prime Video'), ['netflix', 'prime']);
  assert.deepEqual(comboPlatforms('Combo x3: Netflix + ViX + Prime Video'), ['netflix', 'prime', 'vix']);
  assert.deepEqual(comboPlatforms('Combo x3: Netflix + Prime Video + Paramount'), ['netflix', 'prime', 'paramount']);
  assert.deepEqual(comboPlatforms('Netflix+Disney+'), ['netflix', 'disney']);
  for (const name of ['Netflix individual', 'Combo Netflix + Spotify', 'Combo x3: Netflix + Prime Video', 'Netflix + Netflix', 'Netflix + Prime cuentas completas', 'Combo Netflix x33 días + Prime Video']) assert.deepEqual(comboPlatforms(name), [], name);
});
test('bundle sources permit Netflix 28-day profiles and exclude full accounts and other Netflix terms', () => {
  const valid = {name:'Netflix x28 días',category:'Streaming',active:true};
  assert.equal(eligibleComboProduct(valid, 'netflix'), true);
  for(const name of ['Netflix x33 días', 'Netflix x20 días', 'Netflix cuenta completa x28 días', 'Netflix individual'])assert.equal(eligibleComboProduct({...valid,name},'netflix'),false,name);
  for(const name of ['Prime Video full account','Prime cuenta completa','Prime cuenta principal'])assert.equal(eligibleComboProduct({...valid,name},'prime'),false,name);
  assert.equal(isFullAccount('Cuenta completa'), true);
  assert.equal(isFullAccount('Perfil 2'), false);
});

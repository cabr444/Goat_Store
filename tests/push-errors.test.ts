import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushFailure } from '../lib/push-errors';
test('push diagnostics distinguish schema, database, encryption and registration failures safely',()=>{
  const secret='postgresql://user:private-password@private-host/database';
  for(const code of ['P2021','P2022']) assert.equal(pushFailure({code,message:secret}).code,'PUSH_SCHEMA');
  for(const code of ['P1000','P1001','P1002','P1010','P2024']) assert.equal(pushFailure({code,message:secret}).code,'PUSH_DATABASE');
  assert.equal(pushFailure(new Error('Missing delivery encryption secret')).code,'PUSH_ENCRYPTION');
  assert.equal(pushFailure(new SyntaxError(secret)).code,'PUSH_JSON');
  assert.equal(pushFailure({code:'P2002'}).code,'PUSH_CONFLICT');
  assert.equal(pushFailure(new Error(secret)).code,'PUSH_REGISTRATION');
  for(const error of [{code:'P2021',message:secret},new Error(secret),null,undefined]) assert.ok(!JSON.stringify(pushFailure(error)).includes('private-password'));
});

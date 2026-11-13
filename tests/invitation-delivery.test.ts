import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInvitationProduct, readInvitation, invitationSchema } from '../lib/invitation-delivery';
test('only the personal-email YouTube card uses invitations', () => {
  assert.ok(isInvitationProduct({name:' Youtube  Correo Personal '}));
  for (const name of ['YouTube Premium', 'Netflix Correo Personal', 'YouTube cuenta completa']) assert.ok(!isInvitationProduct({name}));
});
test('invitation payload supports pending requests and validates recipient emails', () => {
  assert.deepEqual(readInvitation('{"kind":"youtube-invitation","emails":[]}')?.emails, []);
  assert.ok(invitationSchema.safeParse({kind:'youtube-invitation',emails:['person@example.com']}).success);
  assert.ok(!invitationSchema.safeParse({kind:'youtube-invitation',emails:['invalid']}).success);
  assert.equal(readInvitation('Existing private receipt'), null);
  assert.equal(readInvitation('{"kind":"other","emails":[]}'), null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminderDate } from '../lib/reminder-time';
test('a 29-day reminder preserves purchase time across month/year boundaries', () => {
  assert.equal(reminderDate(new Date('2026-12-15T18:30:00Z'), 29).toISOString(), '2027-01-13T18:30:00.000Z');
  assert.equal(reminderDate(new Date('2028-02-01T18:30:00Z'), 29).toISOString(), '2028-03-01T18:30:00.000Z');
  assert.throws(() => reminderDate(new Date('invalid'), 29));
  assert.throws(() => reminderDate(new Date(), 0));
});
import { planDuration } from '../lib/reminder-time';
import { validCronAuthorization } from '../lib/expiry-notifications';
test('duration detection distinguishes plan intervals from brand numbers', () => {
  for (const [name, expected] of [['Netflix x20 días',20],['Chat GPT Plus x27 Dias',27],['Netflix x33',33],['Office 365',30],['Prime Video x1 mes',30],['Plan 2 meses',60],['Plan 1 año',365],['Plan 2 semanas',14],['Cuenta anual',365],['Activación para siempre',null]]) assert.equal(planDuration(String(name)), expected);
  assert.equal(planDuration('Netflix x20 días', 29),29);
  assert.equal(planDuration('Netflix x20 días', 0),null);
});
test('cron requires a strong server secret and exact bearer authorization', () => {
 const previous=process.env.CRON_SECRET;try {
  process.env.CRON_SECRET='local-expiry-cron-test-secret-123456789';
  assert.equal(validCronAuthorization(null),false);assert.equal(validCronAuthorization('Bearer incorrect'),false);
  assert.equal(validCronAuthorization(`Bearer ${process.env.CRON_SECRET}`),true);
 }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});

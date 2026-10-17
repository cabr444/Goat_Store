// Local integration testing only. Never sends email to an external provider.
const fs = require('node:fs');
const database = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
const origin = new URL(process.env.APP_URL || 'http://invalid');
const capture = process.env.VERIFICATION_EMAIL_CAPTURE;
if (!['localhost','127.0.0.1'].includes(database.hostname) || database.pathname !== '/goat_inventory_test' || !['localhost','127.0.0.1'].includes(origin.hostname) || !capture || process.env.RESEND_API_KEY !== 'goat-registration-test-key') throw Error('Resend mock requires the isolated local registration test environment.');
const original = globalThis.fetch;
globalThis.fetch = async function(input, options) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url === 'https://api.resend.com/emails') {
    const body = JSON.parse(options.body);
    if (!body.to.every(email => email.endsWith('@example.com'))) throw Error('Test recipients only.');
    const prior = fs.existsSync(capture) ? fs.readFileSync(capture,'utf8') : '';
    if (body.to.some(email => email.startsWith('fail-') || (email.startsWith('retry-fail-') && prior.includes(email)))) return new Response('{}',{status:503});
    fs.appendFileSync(capture, JSON.stringify(body)+'\n');
    return new Response('{"id":"local-mail-fixture"}', {status:200,headers:{'Content-Type':'application/json'}});
  }
  return original(input, options);
};

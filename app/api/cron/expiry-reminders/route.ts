import { deliverPurchasePushes, recoverPurchasePushes } from '@/lib/admin-push';
import { deliverDueExpiryPushes } from '@/lib/expiry-push';
import { validCronAuthorization, sendDueExpiryEmails } from '@/lib/expiry-notifications';
import { reply, fail } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function retryPurchasePushes() {
  try { await recoverPurchasePushes(); await deliverPurchasePushes(); }
  catch { console.error('Purchase push retry failed.'); }
}

export async function GET(req: Request) {
  if (!validCronAuthorization(req.headers.get('authorization'))) return fail('No autorizado.', 401);

  const [email, push] = await Promise.allSettled([
    sendDueExpiryEmails(),
    deliverDueExpiryPushes(),
    retryPurchasePushes(),
  ]);
  if (push.status === 'rejected') console.error('Expiry push processing failed.');
  if (email.status === 'rejected') {
    return fail('No se pudieron procesar los correos de recordatorio. Revisa el esquema, Resend y el destinatario.', 503);
  }
  const pushResult = push.status === 'fulfilled' ? push.value : { sent: 0, failed: 1 };
  return reply({ ...email.value, push: pushResult }, email.value.failed || pushResult.failed ? 503 : 200);
}

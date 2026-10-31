import { validCronAuthorization, sendDueExpiryEmails } from '@/lib/expiry-notifications';
import { reply, fail } from '@/lib/http';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(req: Request) {
  if (!validCronAuthorization(req.headers.get('authorization'))) return fail('No autorizado.', 401);
  try { const result = await sendDueExpiryEmails(); return reply(result, result.failed ? 503 : 200); }
  catch { return fail('No se pudieron procesar los recordatorios. Revisa el esquema, Resend y el destinatario.', 503); }
}

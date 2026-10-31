import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { reply, fail } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo administración.', 403);
  try { return reply({ unread: await db.expiryReminder.count({ where: { dueAt: { lte: new Date() }, readAt: null, orderItem: { order: { user: { role: { not: 'ADMIN' } } } } } }) }); }
  catch { return fail('Actualiza el esquema para activar notificaciones.', 503); }
}

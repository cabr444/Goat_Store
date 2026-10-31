import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { reply, fail } from '@/lib/http';
import { secureMutation } from '@/lib/security';
export const PATCH = secureMutation(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo administración.', 403);
  const { id } = await params;
  const result = await db.expiryReminder.updateMany({ where: { id, dueAt: { lte: new Date() }, readAt: null }, data: { readAt: new Date() } });
  return reply({ ok: true, changed: result.count });
});

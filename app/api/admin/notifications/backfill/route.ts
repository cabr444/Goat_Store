import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { secureMutation } from '@/lib/security';
import { backfillExpiryReminders } from '@/lib/expiry-backfill';
import { reply, fail } from '@/lib/http';
export const maxDuration = 60;
export const POST = secureMutation(async (req: Request) => {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo administración.', 403);
  const parsed = z.object({ cursor: z.string().max(100).optional() }).safeParse(await req.json());
  if (!parsed.success) return fail('Solicitud inválida.');
  return reply(await backfillExpiryReminders(parsed.data.cursor));
});

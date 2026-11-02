import { secureMutation } from '@/lib/security';
import { z } from 'zod';
import { rechargeReadKey, readRechargeIds, markRechargeNotificationsRead } from '@/lib/recharge-notification-state';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { reply, fail } from '@/lib/http';
export async function GET() {
  const user = await getUser();
  if (!user) return fail('Inicia sesión para ver tus notificaciones.', 401);
  try {
    const items = await db.walletEvent.findMany({
      where: { userId: user.id, type: 'RECARGA', amount: { gt: 0 } },
      select: { id: true, amount: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20,
    });
    const state = await db.catalogOrder.findUnique({ where: { kind: rechargeReadKey(user.id) } });
    return reply({ userId: user.id, balance: user.balance, items, read: readRechargeIds(state?.ids) });
  } catch { return fail('No fue posible cargar las notificaciones de recarga.', 503); }
}

const readSchema = z.object({ ids: z.array(z.string().min(1).max(100)).max(200) }).strict();
export const POST = secureMutation(async (req: Request) => {
  const user = await getUser();
  if (!user) return fail('Inicia sesión para ver tus notificaciones.', 401);
  const parsed = readSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Notificaciones inválidas.', 400);
  try { return reply({ ok: true, read: await markRechargeNotificationsRead(user.id, parsed.data.ids) }); }
  catch { return fail('No fue posible guardar las notificaciones leídas. Inténtalo de nuevo.', 503); }
});

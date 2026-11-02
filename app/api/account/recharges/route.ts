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
    return reply({ userId: user.id, balance: user.balance, items });
  } catch { return fail('No fue posible cargar las notificaciones de recarga.', 503); }
}

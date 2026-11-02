import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
// Reserved account metadata; never treated as catalogue sorting or financial activity.
export const rechargeReadKey = (userId: string) => 'recharge-notifications-read:' + userId;
export function readRechargeIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(-200) : [];
}
export async function markRechargeNotificationsRead(userId: string, ids: string[]) {
  const owned = await db.walletEvent.findMany({ where: { userId, type: 'RECARGA', amount: { gt: 0 }, id: { in: ids } }, select: { id: true } });
  const kind = rechargeReadKey(userId);
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await db.catalogOrder.findUnique({ where: { kind } });
    const read = [...new Set([...readRechargeIds(current?.ids), ...owned.map(item => item.id)])].slice(-200);
    try {
      if (!current) await db.catalogOrder.create({ data: { kind, ids: read, version: 1 } });
      else {
        const changed = await db.catalogOrder.updateMany({ where: { kind, version: current.version }, data: { ids: read, version: { increment: 1 } } });
        if (!changed.count) continue;
      }
      return read;
    } catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error; }
  }
  throw Error('Read state changed concurrently');
}

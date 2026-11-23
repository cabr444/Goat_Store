import { Prisma } from '@prisma/client';
import { pushConfigured, sendPush } from './admin-push';
import { db } from './db';
import { decryptPrivate } from './private-delivery';
import { pushSubscriptionSchema } from './push-schema';

export async function deliverDueExpiryPushes(now = new Date(), transport = sendPush) {
  if (!pushConfigured()) return { sent: 0, failed: 0 };

  const subscriptions = await db.adminPushSubscription.findMany({
    where: { user: { role: 'ADMIN' } },
    select: { id: true, createdAt: true },
  });
  for (const subscription of subscriptions) {
    const reminders = await db.expiryReminder.findMany({
      where: {
        dueAt: { gte: subscription.createdAt, lte: now },
        orderItem: { order: { user: { role: { not: 'ADMIN' } } } },
        pushDeliveries: { none: { subscriptionId: subscription.id } },
      },
      select: { id: true },
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
      take: 50,
    });
    if (!reminders.length) continue;
    try {
      await db.expiryPushDelivery.createMany({
        data: reminders.map(({ id }) => ({ reminderId: id, subscriptionId: subscription.id })),
        skipDuplicates: true,
      });
    } catch (error) {
      // An unsubscribe or deleted reminder can race with the enqueue. Re-scan on the next cron.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2003') throw error;
    }
  }

  const where = {
    sentAt: null,
    attempts: { lt: 10 },
    OR: [{ claimedAt: null }, { claimedAt: { lt: new Date(now.getTime() - 5 * 60000) } }],
    subscription: { user: { role: 'ADMIN' as const } },
    reminder: { dueAt: { lte: now }, orderItem: { order: { user: { role: { not: 'ADMIN' as const } } } } },
  };
  const deliveries = await db.expiryPushDelivery.findMany({
    where,
    take: 30,
    orderBy: [{ attempts: 'asc' }, { id: 'asc' }],
    include: {
      subscription: { select: { cipher: true } },
      reminder: { include: { orderItem: { select: { order: { select: { id: true, reference: true } } } } } },
    },
  });

  const results = await Promise.allSettled(deliveries.map(async delivery => {
    const claim = await db.expiryPushDelivery.updateMany({
      where: { id: delivery.id, ...where },
      data: { claimedAt: now, attempts: { increment: 1 } },
    });
    if (!claim.count) return false;

    const claimed = { id: delivery.id, claimedAt: now };
    const { reminder } = delivery;
    const { order } = reminder.orderItem;
    try {
      const subscription = pushSubscriptionSchema.parse(JSON.parse(decryptPrivate(delivery.subscription.cipher)));
      const plan = Array.from(reminder.planName.replace(/\s+/g, ' ').trim()).slice(0, 120).join('');
      await transport(subscription, {
        title: 'Goats: recordatorio de vencimiento',
        body: `${reminder.quantity} × ${plan} · Pedido ${order.reference || order.id}`,
        url: `/administracion/ventas/${encodeURIComponent(order.id)}`,
        tag: `expiry-${reminder.id}`,
      });
    } catch (error) {
      const status = (error as { statusCode?: number } | null)?.statusCode;
      if (status === 404 || status === 410) {
        await db.adminPushSubscription.deleteMany({
          where: { id: delivery.subscriptionId, cipher: delivery.subscription.cipher },
        });
      }
      await db.expiryPushDelivery.updateMany({ where: claimed, data: { claimedAt: null } });
      throw error;
    }
    await db.expiryPushDelivery.updateMany({ where: claimed, data: { sentAt: new Date(), claimedAt: null } });
    return true;
  }));
  return {
    sent: results.filter(result => result.status === 'fulfilled' && result.value).length,
    failed: results.filter(result => result.status === 'rejected').length,
  };
}

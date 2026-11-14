import webpush from 'web-push';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { decryptPrivate } from './private-delivery';
import { purchasePush, pushSubscriptionSchema } from './push-schema';
export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}
export async function sendPush(subscription: webpush.PushSubscription, payload: object) {
  if (!pushConfigured()) throw Error('Push not configured');
  return webpush.sendNotification(subscription,JSON.stringify(payload),{
    vapidDetails:{subject:process.env.VAPID_SUBJECT!,publicKey:process.env.VAPID_PUBLIC_KEY!,privateKey:process.env.VAPID_PRIVATE_KEY!},
    TTL:86400,urgency:'high',timeout:8000,
  });
}
export async function queuePurchasePush(tx: Prisma.TransactionClient, orderId: string, purchasedAt: Date) {
  if (!pushConfigured()) return;
  const subscriptions = await tx.adminPushSubscription.findMany({where:{user:{role:'ADMIN'},createdAt:{lte:purchasedAt}},select:{id:true}});
  if (subscriptions.length) await tx.adminPushDelivery.createMany({data:subscriptions.map(subscription=>({orderId,subscriptionId:subscription.id})),skipDuplicates:true});
}
// Recover missed enqueue attempts after a process interruption. Subscriptions
// only receive purchases placed after that phone was registered.
export async function recoverPurchasePushes() {
  if (!pushConfigured()) return;
  const subscriptions = await db.adminPushSubscription.findMany({where:{user:{role:'ADMIN'}},select:{id:true,createdAt:true}});
  for (const subscription of subscriptions) {
    const orders = await db.order.findMany({where:{createdAt:{gte:subscription.createdAt},pushDeliveries:{none:{subscriptionId:subscription.id}}},select:{id:true},orderBy:{createdAt:'asc'},take:100});
    if(orders.length) await db.adminPushDelivery.createMany({data:orders.map(order=>({orderId:order.id,subscriptionId:subscription.id})),skipDuplicates:true});
  }
}
export async function deliverPurchasePushes(orderId?: string) {
  if (!pushConfigured()) return {sent:0,failed:0};
  const now = new Date(), stale = new Date(now.getTime()-5*60000);
  const where = {sentAt:null, attempts:{lt:10}, ...(orderId?{orderId}:{}), OR:[{claimedAt:null},{claimedAt:{lt:stale}}]};
  const rows = await db.adminPushDelivery.findMany({where,take:30,orderBy:{id:'asc'},include:{order:{select:{id:true,reference:true,total:true}},subscription:{include:{user:{select:{role:true}}}}}});
  let sent=0,failed=0;
  const results = await Promise.allSettled(rows.map(async row=>{
    const claim = await db.adminPushDelivery.updateMany({where:{id:row.id,...where},data:{claimedAt:now,attempts:{increment:1}}});
    if (!claim.count) return;
    try {
      if(row.subscription.user.role !== 'ADMIN') {
        await db.adminPushSubscription.deleteMany({where:{id:row.subscriptionId}}); return;
      }
      const subscription = pushSubscriptionSchema.parse(JSON.parse(decryptPrivate(row.subscription.cipher)));
      await sendPush(subscription,purchasePush(row.order));
      await db.adminPushDelivery.updateMany({where:{id:row.id,claimedAt:now},data:{sentAt:new Date(),claimedAt:null}}); sent++;
    } catch(error) {
      const status = (error as {statusCode?:number}).statusCode;
      if(status === 404 || status === 410) await db.adminPushSubscription.deleteMany({where:{id:row.subscriptionId}});
      else await db.adminPushDelivery.updateMany({where:{id:row.id,claimedAt:now},data:{claimedAt:null}});
      failed++;
    }
  }));
  failed += results.filter(result => result.status === 'rejected').length;
  return {sent,failed};
}

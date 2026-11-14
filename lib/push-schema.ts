import { z } from 'zod';
// Browser push endpoints only: never send server requests to arbitrary URLs.
export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash &&
      (url.hostname === 'fcm.googleapis.com' || url.hostname === 'web.push.apple.com' || url.hostname === 'updates.push.services.mozilla.com' || /^[a-z0-9-]+\.push\.services\.mozilla\.com$/.test(url.hostname));
  } catch { return false; }
}
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(4096).refine(allowedPushEndpoint),
  keys: z.object({p256dh:z.string().regex(/^[A-Za-z0-9_-]{87}$/),auth:z.string().regex(/^[A-Za-z0-9_-]{22}$/)}),
});
export function purchasePush(order: {id:string;reference:string|null;total:number}) {
  return {title:'Nueva compra en Goats',body:`Pedido ${order.reference || order.id} · $${new Intl.NumberFormat('es-CO').format(order.total)} COP`,url:`/administracion/ventas/${encodeURIComponent(order.id)}`,tag:`purchase-${order.id}`};
}

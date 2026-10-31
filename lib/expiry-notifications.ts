import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db } from './db';
import { emailConfig } from './password-reset';
import { saleDate } from './admin-sales';
export function validCronAuthorization(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || !header) return false;
  const actual = Buffer.from(header), expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function sendDueExpiryEmails(now = new Date(), transport: typeof fetch = fetch) {
  const config = emailConfig();
  const configured = process.env.EXPIRY_NOTIFICATION_EMAIL?.trim();
  const recipients = configured ? [z.email().parse(configured)] : (await db.user.findMany({ where: { role: 'ADMIN' }, select: { email: true }, take: 50 })).map(user => user.email);
  if (!recipients.length) throw Error('No administrator recipient configured');
  const stale = new Date(now.getTime() - 15 * 60000);
  const where = { dueAt: { lte: now }, emailedAt: null, orderItem: { order: { user: { role: { not: 'ADMIN' as const } } } }, OR: [{ emailClaimedAt: null }, { emailClaimedAt: { lt: stale } }] };
  const reminders = await db.expiryReminder.findMany({ where, orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], take: 50, include: { orderItem: { select: { name: true, unitPrice: true, quantity: true, order: { select: { id: true, reference: true, createdAt: true, user: { select: { name: true, email: true } } } } } } } });
  let sent = 0, failed = 0;
  const started = Date.now();
  for (const reminder of reminders) {
    if (Date.now() - started > 40000) break;
    const claim = await db.expiryReminder.updateMany({ where: { id: reminder.id, ...where }, data: { emailClaimedAt: now, attempts: { increment: 1 } } });
    if (!claim.count) continue;
    try {
      const { orderItem: item } = reminder, { order } = item;
      const response = await transport('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `expiry/${reminder.id}` },
        body: JSON.stringify({ from: config.from, to: recipients, subject: `Goats: vencimiento de ${reminder.planName}`,
          text: `Recordatorio de vencimiento\n\nPedido: ${order.reference || order.id}\nCliente: ${order.user.name}\nCorreo del cliente: ${order.user.email}\nProducto comprado: ${item.name}\nPlan: ${reminder.planName}\nUnidades del plan: ${reminder.quantity}\nCompra: ${saleDate(order.createdAt)}\nDuración: ${reminder.durationDays} días\nVencimiento: ${saleDate(reminder.dueAt)}\nSubtotal comprado: ${item.unitPrice * item.quantity} COP\n\nVer pedido: ${config.origin}/administracion/ventas/${encodeURIComponent(order.id)}\n\nEste aviso no renueva ni cancela el acceso automáticamente.` }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw Error('Email delivery failed');
      await db.expiryReminder.updateMany({ where: { id: reminder.id, emailClaimedAt: now, emailedAt: null }, data: { emailedAt: new Date(), emailClaimedAt: null, lastError: null } });
      sent++;
      if (transport === fetch) await new Promise(resolve => setTimeout(resolve, 600));
    } catch {
      failed++;
      await db.expiryReminder.updateMany({ where: { id: reminder.id, emailClaimedAt: now, emailedAt: null }, data: { emailClaimedAt: null, lastError: 'No se pudo enviar el correo. Se reintentará en la próxima ejecución.' } });
    }
  }
  return { sent, failed, checked: reminders.length };
}

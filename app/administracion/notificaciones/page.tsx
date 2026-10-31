import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getStoreOptions } from '@/lib/store-settings';
import { cop } from '@/lib/account';
import { saleDate } from '@/lib/admin-sales';
import AccountHeader from '@/components/AccountHeader';
import ExpiryReminderCard from '@/components/ExpiryReminderCard';
import ExpiryBackfill from '@/components/ExpiryBackfill';
import ExpiryReminderRead from '@/components/ExpiryReminderRead';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vencimientos | Goats', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ estado?: string; pagina?: string }> }) {
  const user = await getUser(); if (!user) redirect('/acceso'); if (user.role !== 'ADMIN') redirect('/perfil');
  const raw = await searchParams, state = ['proximos', 'revisados'].includes(raw.estado || '') ? raw.estado! : 'pendientes', now = new Date();
  const where = { orderItem: { order: { user: { role: { not: 'ADMIN' as const } } } }, ...(state === 'proximos' ? { dueAt: { gt: now } } : state === 'revisados' ? { readAt: { not: null } } : { dueAt: { lte: now }, readAt: null }) };
  const count = await db.expiryReminder.count({ where }), pages = Math.max(1, Math.ceil(count / 25)), page = Math.max(1, Math.min(/^\d{1,6}$/.test(raw.pagina || '') ? Number(raw.pagina) : 1, pages));
  const emailReady = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.APP_URL && process.env.CRON_SECRET);
  const reminders = await db.expiryReminder.findMany({ where, orderBy: [{ dueAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * 25, take: 25, include: { orderItem: { select: { name: true, quantity: true, unitPrice: true, order: { select: { id: true, reference: true, createdAt: true, user: { select: { name: true, email: true } } } } } } } });
  return <><AccountHeader name={user.name} role={user.role} balance={user.balance} storeOptions={await getStoreOptions()}/><main className="container admin-dashboard"><Link className="account-back" href="/administracion/ventas">← Administración</Link><h1>Recordatorios de vencimiento</h1><p>Según la duración guardada al comprar. Fechas en hora de Bogotá. Los correos se procesan diariamente; revisarlos aquí no cancela el envío ni renueva el acceso.</p><nav className="admin-quick-links" aria-label="Estado de recordatorios"><Link href="?estado=pendientes">Pendientes</Link><Link href="?estado=proximos">Próximos</Link><Link href="?estado=revisados">Revisados</Link></nav>
  {!emailReady && <p role="status">Para activar el correo automático configura RESEND_API_KEY, EMAIL_FROM, APP_URL y CRON_SECRET en Vercel. Los avisos del panel funcionan sin correo.</p>}
  <p className="admin-help">Duración automática según el nombre; 30 días si no se indica. Puedes cambiarla en Editar producto para futuras compras. Las compras anteriores se importan automáticamente al abrir esta página, sin modificar recordatorios existentes.</p>
  <div className="expiry-legend" aria-label="Escala de vencimientos"><span className="expiry-key-active">Más de 3 días</span><span className="expiry-key-warning">3 días o menos</span><span className="expiry-key-urgent">24 horas o menos</span><span className="expiry-key-expired">Vencido</span></div>
  <ExpiryBackfill/>
  {reminders.map(reminder => { const item = reminder.orderItem, order = item.order; return <ExpiryReminderCard key={reminder.id} dueAt={reminder.dueAt.toISOString()} serverTime={now.getTime()}><h2>{reminder.planName}</h2><p><strong>{order.user.name}</strong> · {order.user.email}</p><p>Pedido: {order.reference || order.id} · Producto: {item.name} · {reminder.quantity} unidades del plan</p><p>Compra: {saleDate(order.createdAt)} · Duración: {reminder.durationDays} días · Vencimiento: <strong>{saleDate(reminder.dueAt)}</strong></p><p>Subtotal del producto: {cop(item.unitPrice * item.quantity)}</p><p>Correo: {reminder.emailedAt ? `Enviado ${saleDate(reminder.emailedAt)}` : reminder.lastError || 'Pendiente de envío al vencer'}</p><Link className="button violet" href={`/administracion/ventas/${encodeURIComponent(order.id)}`}>Ver venta y comprobante</Link>{!reminder.readAt && reminder.dueAt <= now && <ExpiryReminderRead id={reminder.id}/>}</ExpiryReminderCard>; })}
  {!reminders.length && <p>No hay recordatorios en esta sección.</p>}<nav className="admin-pagination"><span>{count} recordatorios · Página {page} de {pages}</span>{page > 1 && <Link href={`?estado=${state}&pagina=${page-1}`}>← Anterior</Link>}{page < pages && <Link href={`?estado=${state}&pagina=${page+1}`}>Siguiente →</Link>}</nav></main></>;
}

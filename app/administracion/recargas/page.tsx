import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getStoreOptions } from '@/lib/store-settings';
import AccountHeader from '@/components/AccountHeader';
import AdminRechargeForm from '@/components/AdminRechargeForm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recargar saldo | Goats', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const user = await getUser(); if (!user) redirect('/acceso'); if (user.role !== 'ADMIN') redirect('/perfil');
  const raw = await searchParams;
  const users = await db.user.findMany({ select: { id: true, name: true, email: true, balance: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  return <><AccountHeader name={user.name} role={user.role} balance={user.balance} storeOptions={await getStoreOptions()}/><main className="container admin-dashboard"><Link className="account-back" href="/administracion/ventas">← Panel de administración</Link><span className="overline">ADMINISTRACIÓN</span><h1>Recargar saldo</h1><p>Busca una cuenta y registra la recarga. Cada movimiento queda guardado en el historial.</p><AdminRechargeForm initialUsers={users} initialId={typeof raw.cliente === 'string' ? raw.cliente : ''}/><Link className="admin-text-link" href="/administracion/clientes">Ver clientes e historial de recargas →</Link></main></>;
}

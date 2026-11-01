import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { getStoreOptions } from '@/lib/store-settings';
import AccountHeader from '@/components/AccountHeader';
import PlatformAccountForm from '@/components/PlatformAccountForm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cuentas de plataformas | Goats', robots: { index: false, follow: false } };
export default async function Page() {
  const user = await getUser(); if (!user) redirect('/acceso'); if (user.role !== 'ADMIN') redirect('/perfil');
  return <><AccountHeader name={user.name} balance={user.balance} role={user.role} storeOptions={await getStoreOptions()}/><main className="container admin-dashboard"><Link className="account-back" href="/administracion/ventas">← Panel de administración</Link><div className="admin-page-heading"><div><span className="overline">SOLO ADMINISTRACIÓN</span><h1>Cuentas de plataformas</h1><p>Registro privado de Prime Video, YouTube y Netflix, con exportación CSV.</p></div></div><PlatformAccountForm/></main></>;
}

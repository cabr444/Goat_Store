import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { getStoreOptions } from '@/lib/store-settings';
import AccountHeader from '@/components/AccountHeader';
import AdminPaymentSandbox from '@/components/AdminPaymentSandbox';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'BIN y sandbox | Goats', robots: { index: false, follow: false } };
export default async function Page() {
  const user = await getUser(); if (!user) redirect('/acceso'); if (user.role !== 'ADMIN') redirect('/perfil');
  return <><AccountHeader name={user.name} balance={user.balance} role={user.role} storeOptions={await getStoreOptions()}/><main className="container admin-dashboard"><Link className="account-back" href="/administracion/ventas">← Administración</Link><span className="overline">SOLO ADMINISTRACIÓN</span><h1>BIN y pruebas sandbox</h1><p>Metadatos de prefijos y simulaciones con fixtures oficiales. No admite la comprobación de tarjetas reales.</p><AdminPaymentSandbox/></main></>;
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getStoreOptions } from '@/lib/store-settings';
import { cop, accountDate } from '@/lib/account';
import { saleDate } from '@/lib/admin-sales';
import AccountHeader from '@/components/AccountHeader';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'Clientes y recargas | Goats',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{q?:string;pagina?:string}>}){
 const admin=await getUser();if(!admin)redirect('/acceso');if(admin.role!=='ADMIN')redirect('/perfil');
 const raw=await searchParams,q=typeof raw.q==='string'?raw.q.trim().slice(0,100):'',where=q?{OR:[{name:{contains:q,mode:'insensitive' as const}},{email:{contains:q,mode:'insensitive' as const}}]}:{};
 const count=await db.user.count({where}),pages=Math.max(1,Math.ceil(count/25)),page=Math.max(1,Math.min(typeof raw.pagina==='string'&&/^\d{1,6}$/.test(raw.pagina)?Number(raw.pagina):1,pages));
 const [clients,recharges]=await Promise.all([
  db.user.findMany({where,select:{id:true,name:true,email:true,role:true,balance:true,createdAt:true,_count:{select:{orders:true}}},orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*25,take:25}),
  db.walletEvent.findMany({where:{type:'RECARGA',...(q?{user:where}:{})},select:{id:true,amount:true,note:true,createdAt:true,user:{select:{name:true,email:true}}},orderBy:[{createdAt:'desc'},{id:'desc'}],take:20}),
 ]);
 const spending=await db.order.groupBy({by:['userId'],where:{userId:{in:clients.map(client=>client.id)}},_sum:{total:true}}),spent=new Map(spending.map(row=>[row.userId,row._sum.total||0]));
 const pageLink=(value:number)=>'?'+new URLSearchParams({q,pagina:String(value)}).toString();
 return <><AccountHeader name={admin.name} balance={admin.balance} role={admin.role} storeOptions={await getStoreOptions()}/><main className="container admin-dashboard"><Link className="account-back" href="/administracion/ventas">← Panel de administración</Link><div className="admin-page-heading"><div><span className="overline">CLIENTES Y SALDOS</span><h1>Conoce a tus compradores.</h1><p>Datos de cuenta, compras y últimas recargas administrativas.</p></div><Link className="button violet" href="/administracion#recargas">Recargar saldo</Link></div>
 <section className="admin-panel"><h2>Cuentas de la tienda</h2><form method="get" className="admin-client-search"><label>Buscar cliente<input name="q" defaultValue={q} placeholder="Nombre o correo" maxLength={100}/></label><button className="button violet">Buscar</button><Link className="button outline" href="/administracion/clientes">Limpiar</Link></form><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Cliente / registro</th><th>Correo / rol</th><th>Saldo actual</th><th>Compras</th><th>Acciones</th></tr></thead><tbody>{clients.map(client=><tr key={client.id}><td><strong>{client.name}</strong><small>{accountDate(client.createdAt)}</small></td><td>{client.email}<small>{client.role}</small></td><td>{cop(client.balance)}</td><td>{client._count.orders} pedidos<small>{cop(spent.get(client.id)||0)}</small></td><td><Link className="admin-text-link" href={'/administracion/ventas?q='+encodeURIComponent(client.email)}>Ver compras</Link><br/><Link className="admin-text-link" href={'/administracion?cliente='+encodeURIComponent(client.id)+'#recargas'}>Recargar saldo</Link></td></tr>)}</tbody></table></div>{!clients.length&&<p className="account-empty">No se encontraron cuentas.</p>}<nav className="admin-pagination" aria-label="Páginas de clientes"><span>{count} cuentas · Página {page} de {pages}</span>{page>1&&<Link href={pageLink(page-1)}>← Anterior</Link>}{page<pages&&<Link href={pageLink(page+1)}>Siguiente →</Link>}</nav></section>
 <section className="admin-panel"><h2>Últimas 20 recargas</h2><p className="admin-help">Aplican la búsqueda de cliente. Los importes provienen del registro de recargas guardado.</p><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Importe</th><th>Nota</th></tr></thead><tbody>{recharges.map(event=><tr key={event.id}><td>{saleDate(event.createdAt)}</td><td>{event.user.name}<small>{event.user.email}</small></td><td>{cop(event.amount)}</td><td>{event.note}</td></tr>)}</tbody></table></div>{!recharges.length&&<p className="account-empty">No hay recargas registradas con esta búsqueda.</p>}</section></main></>;
}

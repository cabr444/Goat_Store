import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getStoreOptions } from '@/lib/store-settings';
import { cop, accountDate } from '@/lib/account';
import { saleDate, saleSelect } from '@/lib/admin-sales';
import { decryptPrivate } from '@/lib/private-delivery';
import AccountHeader from '@/components/AccountHeader';
import AdminOrderStatus from '@/components/AdminOrderStatus';
import PurchaseReceipt from '@/components/PurchaseReceipt';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'Detalle de venta | Goats',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){
 const user=await getUser();if(!user)redirect('/acceso');if(user.role!=='ADMIN')redirect('/perfil');const {id}=await params;
 const order=await db.order.findUnique({where:{id},select:{...saleSelect,user:{select:{id:true,name:true,email:true,role:true,balance:true,createdAt:true}},items:{select:{...saleSelect.items.select,receiptCipher:true,streamingAccesses:{select:{id:true,product:{select:{name:true}}}}}}}});if(!order)notFound();
 return <><AccountHeader name={user.name} balance={user.balance} role={user.role} storeOptions={await getStoreOptions()}/><main className="container admin-dashboard"><Link className="account-back" href="/administracion/ventas">← Volver a ventas</Link><div className="admin-page-heading"><div><span className="overline">DETALLE DEL PEDIDO</span><h1>{order.reference||order.id}</h1><p>{saleDate(order.createdAt)} · {order.status.replaceAll('_',' ')}</p></div><strong className="admin-order-total">{cop(order.total)}</strong></div>
 <div className="admin-detail-grid"><section className="admin-panel"><h2>Comprador</h2><dl className="admin-detail-list"><dt>Nombre</dt><dd>{order.user.name}</dd><dt>Correo</dt><dd>{order.user.email}</dd><dt>ID de cliente</dt><dd>{order.user.id}</dd><dt>Rol</dt><dd>{order.user.role}</dd><dt>Registro</dt><dd>{accountDate(order.user.createdAt)}</dd><dt>Saldo actual</dt><dd>{cop(order.user.balance)}</dd></dl><Link className="admin-text-link" href={'/administracion/ventas?q='+encodeURIComponent(order.user.email)}>Ver compras del cliente</Link></section><section className="admin-panel"><h2>Control de entrega</h2><p>ID del pedido: <span className="admin-break">{order.id}</span></p><AdminOrderStatus id={order.id} status={order.status}/></section></div>
 <section className="admin-panel"><h2>Productos comprados</h2>{order.items.map(item=>{let receipt:string|null=null;if(item.receiptCipher){try{receipt=decryptPrivate(item.receiptCipher);}catch{receipt='No se pudo abrir el comprobante. Revisa la configuración privada del servidor.';}}return <article key={item.id} className="admin-sale-item"><h3>{item.name}</h3><p>{item.category||item.product.category} · {item.quantity} unidades × {cop(item.unitPrice)} · Subtotal {cop(item.unitPrice*item.quantity)}</p><small>ID de producto: {item.productId}</small>{item.streamingAccesses.length>0&&<p>Accesos asignados: {item.streamingAccesses.map(access=>access.product.name).join(', ')}</p>}{receipt?<details><summary>Ver comprobante y accesos privados</summary><PurchaseReceipt text={receipt}/></details>:<p>Entrega manual: coordina el acceso o producto con el cliente.</p>}</article>})}</section></main></>;
}

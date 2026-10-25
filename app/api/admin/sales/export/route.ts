export const dynamic='force-dynamic';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { fail } from '@/lib/http';
import { salesFilters, salesWhere, saleSelect, saleDate, csvCell } from '@/lib/admin-sales';
export async function GET(req:Request){
  if((await getUser())?.role!=='ADMIN')return fail('Solo el administrador puede exportar ventas.',403);
  const raw=Object.fromEntries(new URL(req.url).searchParams),where=salesWhere(salesFilters(raw));
  const orders=await db.order.findMany({where,select:saleSelect,orderBy:[{createdAt:'desc'},{id:'desc'}],take:1001});
  if(orders.length>1000)return fail('La exportación admite hasta 1000 pedidos. Reduce el rango de fechas o aplica filtros.');
  const rows:unknown[][]=[['Pedido','Fecha (Bogotá)','Cliente','Correo','Producto','Categoría','Cantidad','Precio unitario COP','Subtotal COP','Estado']];
  for(const order of orders)for(const item of order.items)rows.push([order.reference||order.id,saleDate(order.createdAt),order.user.name,order.user.email,item.name,item.category||item.product.category,item.quantity,item.unitPrice,item.unitPrice*item.quantity,order.status]);
  return new Response('\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="ventas-goats.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

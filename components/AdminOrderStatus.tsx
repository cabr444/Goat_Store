"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AdminOrderStatus({ id, status }: { id: string; status: string }) {
  const router = useRouter(), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  if (!['ENTREGADO','PENDIENTE_ENTREGA'].includes(status)) return <p>Este estado no admite cambios desde este panel.</p>;
  return <div className="admin-delivery-control"><p>Actualiza únicamente el estado de entrega. El cambio no modifica el saldo, stock ni accesos asignados.</p><button type="button" className="button violet" disabled={busy} onClick={async()=>{
    setBusy(true);setMessage('');
    try {const response=await fetch('/api/admin/orders/'+encodeURIComponent(id)+'/status',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedStatus:status,status:status==='ENTREGADO'?'PENDIENTE_ENTREGA':'ENTREGADO'})});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo actualizar el estado.');setMessage('Estado de entrega actualizado.');router.refresh();}catch(error){setMessage(error instanceof Error?error.message:'No se pudo actualizar.');}finally{setBusy(false);}
  }}>{busy?'Guardando…':status==='ENTREGADO'?'Marcar como pendiente':'Marcar como entregado'}</button>{message&&<p role="status">{message}</p>}</div>;
}

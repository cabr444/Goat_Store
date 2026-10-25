"use client";
import { useState } from 'react';
export default function AdminSalesExport({ href }: { href: string }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <div><button type="button" className="button violet" disabled={busy} onClick={async()=>{
    setBusy(true);setError('');
    try {
      const response=await fetch(href,{cache:'no-store'});
      if(!response.ok){const data=await response.json();throw Error(data.error||'No se pudo exportar el historial.');}
      const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download='ventas-goats.csv';document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){setError(error instanceof Error?error.message:'No se pudo exportar el historial.');}finally{setBusy(false);}
  }}>{busy?'Preparando CSV…':'Exportar CSV'}</button>{error&&<p role="alert" className="admin-export-error">{error}</p>}</div>;
}

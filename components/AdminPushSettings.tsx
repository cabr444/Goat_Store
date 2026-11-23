'use client';
import { useEffect, useState } from 'react';
function applicationKey(value:string) {
  const decoded=atob(value.replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(decoded,character=>character.charCodeAt(0));
}
export default function AdminPushSettings() {
  const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[supported,setSupported]=useState(true);
  useEffect(()=>{
    const supported=window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setSupported(supported);
    if(supported) void navigator.serviceWorker.getRegistration('/').then(registration=>registration?.pushManager.getSubscription()).then(subscription=>setEnabled(Boolean(subscription))).catch(()=>{});
  },[]);
  async function request(method:string,body:object) {
    const response=await fetch('/api/admin/push',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();if(!response.ok) throw Error(data.error || 'No se pudo actualizar la configuración.');return data;
  }
  async function action(kind:'enable'|'disable'|'test') {
    setBusy(true);setMessage('');
    try {
      // Permission is requested directly from the user's tap, never on page load.
      if(kind==='enable' && await Notification.requestPermission() !== 'granted') throw Error('Permite las notificaciones de esta tienda en la configuración de Chrome.');
      const response=await fetch('/api/admin/push',{cache:'no-store'}), config=await response.json();
      if(!response.ok) throw Error(config.error || 'No se pudo consultar la configuración.');
      if(kind!=='disable' && !config.configured) throw Error('Falta configurar las claves VAPID del servidor.');
      const registration=await navigator.serviceWorker.register('/push-sw.js',{scope:'/'});
      await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if(kind==='disable') {
        if(subscription) {await request('DELETE',{endpoint:subscription.endpoint});await subscription.unsubscribe();}
        setEnabled(false);setMessage('Notificaciones desactivadas en este teléfono.');return;
      }
      if(subscription) {
        const subscribedKey=subscription.options.applicationServerKey;
        const configuredKey=applicationKey(config.publicKey);
        if(subscribedKey && (subscribedKey.byteLength!==configuredKey.byteLength || new Uint8Array(subscribedKey).some((value,index)=>value!==configuredKey[index]))) {
          await request('DELETE',{endpoint:subscription.endpoint});
          if(!await subscription.unsubscribe()) throw Error('No se pudo renovar la suscripción anterior. Inténtalo de nuevo.');
          subscription=null;
        }
      }
      if(!subscription) subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationKey(config.publicKey)});
      await request('POST',{subscription:subscription.toJSON()});setEnabled(true);
      if(kind==='test') {await request('POST',{subscription:subscription.toJSON(),test:true});setMessage('Prueba enviada. Comprueba las notificaciones del teléfono.');}
      else setMessage('Notificaciones activadas. Pulsa Probar notificación para comprobar este teléfono.');
    } catch(error) {setMessage(error instanceof Error?error.message:'No se pudo activar. Inténtalo de nuevo.');}
    finally{setBusy(false);}
  }
  return <section className="admin-panel"><h2>Compras y vencimientos: notificaciones en tu teléfono</h2><p>Abre esta página en Chrome de Android e inicia sesión como administrador. Activa los avisos en cada teléfono donde quieras recibirlos, incluso cuando la tienda esté cerrada.</p>
    {!supported?<p>Necesitas un navegador compatible y la tienda abierta mediante HTTPS.</p>:<div className="actions">
      <button type="button" className="button violet" disabled={busy} onClick={()=>void action('enable')}>{enabled?'Volver a activar':'Activar notificaciones'}</button>
      {enabled&&<><button type="button" className="button outline" disabled={busy} onClick={()=>void action('test')}>Probar notificación</button><button type="button" className="button outline" disabled={busy} onClick={()=>void action('disable')}>Desactivar en este teléfono</button></>}
    </div>}{message&&<p role="status">{message}</p>}<p>Las compras muestran productos, cantidades, número y total del pedido. Los recordatorios muestran el plan que vence y el número del pedido. Tócalos para abrir la venta; no muestran claves ni comprobantes privados.</p></section>;
}

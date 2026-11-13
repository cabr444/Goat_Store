'use client';
import { useState } from 'react';
export default function InvitationForm({ itemId, emails: initial }: { itemId?: string; emails: string[] }) {
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return <section className="purchase-receipt"><h4>Invitación de YouTube Premium</h4>
    {saved.length ? <><p>Correo guardado. La invitación está pendiente de envío por el administrador.</p>{saved.map((email, i) => <p key={i}>{email}</p>)}</> : !itemId ? <p>El cliente aún no ha indicado su correo.</p> : <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage('');
      const form = new FormData(event.currentTarget);
      const emails = String(form.get('emails') || '').split(/[,;\n]+/).map(value => value.trim()).filter(Boolean);
      try {
        const response = await fetch(`/api/orders/items/${encodeURIComponent(itemId)}/invitation`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emails})});
        const data = await response.json(); if (!response.ok) throw Error(data.error || 'No se pudo guardar el correo.');
        setSaved(emails);
      } catch (error) {setMessage(error instanceof Error ? error.message : 'Inténtalo de nuevo.');} finally {setBusy(false);}
    }}><p>Introduce el correo donde quieres recibir la invitación. Si compraste varias unidades, escribe un correo por unidad, separados por comas.</p>
      <label>Correo para la invitación<input name="emails" type="text" inputMode="email" autoComplete="email" required maxLength={9600} placeholder="tu@email.com" disabled={busy}/></label>
      <button className="button violet" disabled={busy}>{busy ? 'Guardando…' : 'Guardar correo para la invitación'}</button>
      {message && <p role="alert">{message}</p>}
    </form>}
  </section>;
}

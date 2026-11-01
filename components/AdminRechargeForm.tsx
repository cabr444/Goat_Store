"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { readJsonResponse } from '@/lib/json-response';
type User = { id: string; name: string; email: string; balance: number };
const money = (amount: number) => '$' + new Intl.NumberFormat('es-CO').format(amount);
export default function AdminRechargeForm({ initialUsers, initialId }: { initialUsers: User[]; initialId: string }) {
  const [users, setUsers] = useState(initialUsers), [selected, setSelected] = useState(initialId), [query, setQuery] = useState(''), [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  const lock = useRef(false), router = useRouter();
  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);
  const target = users.find(user => user.id === selected), term = query.trim().toLocaleLowerCase('es');
  const matches = users.filter(user => user.id === selected || [user.name, user.email].some(value => value.toLocaleLowerCase('es').includes(term)));
  async function submit(event: FormEvent) {
    event.preventDefault(); if (lock.current || !target) return;
    lock.current = true; setBusy(true); setMessage(''); setFailed(false);
    try {
      const value = Number(amount);
      const result = await readJsonResponse(await fetch('/api/admin/recharge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: target.id, amount: value, note: 'Recarga manual desde panel Goats' }), signal: AbortSignal.timeout(30000) }));
      setUsers(current => current.map(user => user.id === target.id ? { ...user, balance: result.balance } : user));
      setAmount(''); setMessage(`Recarga de ${money(value)} registrada para ${target.name}. Saldo actual: ${money(result.balance)}.`); router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof DOMException && ['TimeoutError','AbortError'].includes(error.name) ? 'No se pudo confirmar la respuesta. Revisa el historial de recargas antes de reintentar.' : error instanceof Error ? error.message : 'No se pudo registrar la recarga.');
    } finally { lock.current = false; setBusy(false); }
  }
  return <form className="admin-panel admin-recharge-form" onSubmit={submit}><fieldset disabled={busy}><legend>Recarga administrativa</legend><label>Buscar cliente<input type="search" value={query} maxLength={100} placeholder="Nombre o correo" onChange={event => { setQuery(event.target.value); setSelected(''); setAmount(''); setMessage(''); }}/></label><label>Cuenta de usuario<select required value={selected} onChange={event => { setSelected(event.target.value); setAmount(''); setMessage(''); }}><option value="">Selecciona un usuario</option>{matches.map(user => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label>{target && <div className="recharge-target"><strong>{target.name}</strong><span>{target.email}</span><span>Saldo actual: <strong>{money(target.balance)} COP</strong></span></div>}<label>Valor de la recarga (COP)<input type="number" required min={1} max={10000000} step={1} value={amount} onChange={event => setAmount(event.target.value)} placeholder="Ejemplo: 20000"/></label><button type="submit" className="button violet full" disabled={busy || !target}>{busy ? 'Registrando recarga…' : 'Recargar saldo'}</button></fieldset>{message && <p className={`shared-account-feedback ${failed ? 'failed' : 'saved'}`} role={failed ? 'alert' : 'status'}>{message}</p>}</form>;
}

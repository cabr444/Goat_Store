"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { Bell, Check, Wallet } from 'lucide-react';
type Item = { id: string; amount: number; createdAt: string };
type Data = { userId: string; items: Item[]; balance: number };
const Context = createContext<{ data: Data | null; read: string[]; error: string; markRead: () => void; reload: () => void; subscribe: () => () => void } | null>(null);
export function RechargeNotificationProvider({ children }: { children: ReactNode }) {
  const requestVersion = useRef(0);
  const [consumers, setConsumers] = useState(0);
  const subscribe = useCallback(() => { setConsumers(n => n + 1); return () => setConsumers(n => n - 1); }, []);
  const [data, setData] = useState<Data | null>(null), [read, setRead] = useState<string[]>([]), [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    const version = ++requestVersion.current;
    try {
      const response = await fetch('/api/account/recharges', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (version !== requestVersion.current) return;
      if (response.status === 401) { setData(null); setRead([]); setError('Inicia sesión para ver las recargas.'); return; }
      if (!response.ok) throw Error();
      const next: Data = await response.json();
      if (version !== requestVersion.current) return;
      let saved: unknown = [];
      try { saved = JSON.parse(localStorage.getItem('goats-recharges-read:' + next.userId) || '[]'); } catch {}
      setRead(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string').slice(-200) : []);
      setData(next); setError('');
    } catch { if (version !== requestVersion.current) return; setError('No fue posible actualizar las notificaciones. Inténtalo de nuevo.'); }
  }, []);
  useEffect(() => {
    if (!consumers) { setData(null); setRead([]); setError(''); return; }
    void reload(); const timer = window.setInterval(reload, 60000);
    const visible = () => { if (document.visibilityState === 'visible') void reload(); };
    const storage = (event: StorageEvent) => { if (event.key?.startsWith('goats-recharges-read:') || event.key === null) void reload(); };
    window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible); window.addEventListener('storage', storage);
    return () => { ++requestVersion.current; window.clearInterval(timer); window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); window.removeEventListener('storage', storage); };
  }, [reload, consumers]);
  function markRead() {
    if (!data) return;
    const next = [...new Set([...read, ...data.items.map(item => item.id)])].slice(-200);
    setRead(next); try { localStorage.setItem('goats-recharges-read:' + data.userId, JSON.stringify(next)); } catch {}
  }
  return <Context.Provider value={{ data, read, error, markRead, reload, subscribe }}>{children}</Context.Provider>;
}
export function RechargeNotificationBell() {
  const state = useContext(Context);
  const subscribe = state?.subscribe;
  useEffect(() => subscribe?.(), [subscribe]);
  const count = state?.data?.items.filter(item => !state.read.includes(item.id)).length || 0;
  return <a className="icon-button recharge-notification-bell" href="/perfil#notificaciones-recargas" aria-label={`Notificaciones de recarga: ${count} sin leer`} title="Notificaciones de recarga"><Bell size={20} aria-hidden="true"/>{count > 0 && <span className="count">{count}</span>}</a>;
}
export function RechargeNotificationList() {
  const state = useContext(Context);
  const subscribe = state?.subscribe;
  useEffect(() => subscribe?.(), [subscribe]);
  if (!state) return null;
  const money = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  return <section id="notificaciones-recargas" className="recharge-notifications account-section" aria-labelledby="recharge-notification-title"><div className="account-section-heading"><h2 id="recharge-notification-title"><Bell size={20} aria-hidden="true"/> Notificaciones de recarga</h2><button type="button" className="button outline" onClick={state.markRead} disabled={!state.data?.items.some(item => !state.read.includes(item.id))}><Check size={16} aria-hidden="true"/>Marcar como leídas</button></div><p>Últimas 20 recargas confirmadas. Se actualiza cada minuto mientras estás en la página.</p>{state.error && <p role="alert">{state.error} <button type="button" onClick={state.reload}>Reintentar</button></p>}{!state.data && !state.error && <p role="status">Cargando recargas…</p>}{state.data && !state.data.items.length && <p>Aún no tienes recargas. Cuando se agregue saldo, aparecerá aquí.</p>}<div className="recharge-notification-items">{state.data?.items.map(item => { const unread = !state.read.includes(item.id); return <article key={item.id} className={unread ? 'recharge-notice unread' : 'recharge-notice'}><Wallet size={22} aria-hidden="true"/><div><strong>Se agregaron {money(item.amount)} a tu saldo</strong><time dateTime={item.createdAt}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(item.createdAt))}</time></div><span>{unread ? 'Nueva' : 'Leída'}</span></article>; })}</div><p className="admin-help">Las marcas de lectura se guardan en este navegador. Estas son notificaciones dentro de Goats; no se envían mensajes ni correos.</p></section>;
}

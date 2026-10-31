"use client";
import { useEffect, useState, type ReactNode } from 'react';
export default function ExpiryReminderCard({ dueAt, serverTime, children }: { dueAt: string; serverTime: number; children: ReactNode }) {
  const [now, setNow] = useState(serverTime);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = new Date(dueAt).getTime() - now;
  const state = remaining <= 0 ? 'expired' : remaining <= 86400000 ? 'urgent' : remaining <= 3 * 86400000 ? 'warning' : 'active';
  const label = state === 'expired' ? 'VENCIDO' : state === 'urgent' ? 'VENCE EN 24 HORAS O MENOS' : state === 'warning' ? 'PRÓXIMO A VENCER' : 'ACTIVO';
  const minutes = Math.max(0, Math.ceil(remaining / 60000));
  const time = remaining <= 0 ? 'El tiempo del plan se ha completado.' : remaining >= 86400000 ? `Faltan ${Math.ceil(remaining / 86400000)} días.` : `Faltan ${Math.floor(minutes / 60)} h ${minutes % 60} min.`;
  return <article className={`admin-panel expiry-card expiry-${state}`}>
    <div className="expiry-status-row" aria-live="polite"><span className="expiry-status-badge">{label}</span><strong>{time}</strong></div>
    {children}
  </article>;
}

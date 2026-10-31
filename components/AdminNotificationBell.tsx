"use client";
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
export default function AdminNotificationBell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => { if (document.visibilityState !== 'visible') return; try { const response = await fetch('/api/admin/notifications', { cache: 'no-store', signal: AbortSignal.timeout(10000) }); if (response.ok) { const data = await response.json(); if (active) setCount(data.unread); } } catch {} };
    void load(); const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  return <a className="icon-button" href="/administracion/notificaciones" aria-label={`Notificaciones de vencimiento: ${count} pendientes`}><Bell size={20}/>{count > 0 && <span className="count">{count > 99 ? '99+' : count}</span>}</a>;
}

"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readJsonResponse } from '@/lib/json-response';
export default function ExpiryBackfill() {
  const router = useRouter(), [attempt, setAttempt] = useState(0), [message, setMessage] = useState('Importando recordatorios de compras anteriores…'), [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    async function run() {
      let cursor = '', added = 0, undetermined = 0;
      setFailed(false); setMessage('Importando recordatorios de compras anteriores…');
      try {
        while (active) {
          const data = await readJsonResponse(await fetch('/api/admin/notifications/backfill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cursor }), signal: AbortSignal.timeout(45000) }));
          if (!active) return;
          added += data.added; undetermined += data.undetermined;
          if (!data.more) break;
          if (data.cursor === cursor) throw Error('No se pudo avanzar. Vuelve a intentarlo.');
          cursor = data.cursor;
          setMessage(`Importando compras anteriores… ${added} recordatorios añadidos.`);
        }
        if (!active) return;
        setMessage(`${added} recordatorios históricos añadidos. Los existentes se conservaron.${undetermined ? ` ${undetermined} combos no pudieron reconstruirse desde sus comprobantes y necesitan revisión manual.` : ''}`);
        router.refresh();
      } catch (error) { if (active) { setFailed(true); setMessage(error instanceof Error ? error.message : 'No se pudieron importar los recordatorios.'); } }
    }
    void run(); return () => { active = false; };
  }, [attempt, router]);
  return <div className="admin-panel"><p role={failed ? 'alert' : 'status'}>{message}</p>{failed && <button type="button" className="button violet" onClick={() => setAttempt(value => value + 1)}>Reintentar importación</button>}<small>Se usa la fecha original y el nombre vendido. Sin duración explícita: 30 días. Los vencidos aparecen en Pendientes y quedan en la cola de correo. Se excluyen compras de administradores, planes permanentes y productos con recordatorios desactivados.</small></div>;
}

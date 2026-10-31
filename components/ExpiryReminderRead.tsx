"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { readJsonResponse } from '@/lib/json-response';
export default function ExpiryReminderRead({ id }: { id: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''); const router = useRouter();
  return <><button type="button" className="button outline" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await readJsonResponse(await fetch(`/api/admin/notifications/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000) })); router.refresh(); } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo actualizar.'); } finally { setBusy(false); } }}>{busy ? 'Guardando…' : 'Marcar como revisado'}</button>{error && <p role="alert">{error}</p>}</>;
}

"use client";
import { useState, type FormEvent } from 'react';
import { readJsonResponse } from '@/lib/json-response';
import { sandboxCards } from '@/lib/sandbox-cards';
type Metadata = { found: boolean; scheme?: string; type?: string; brand?: string; country?: string; bank?: string };
export default function AdminPaymentSandbox() {
  const [bin, setBin] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [metadata, setMetadata] = useState<Metadata | null>(null);
  const [scenario, setScenario] = useState<string>(sandboxCards[0].id), [result, setResult] = useState('');
  const card = sandboxCards.find(value => value.id === scenario)!;
  async function lookup(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMetadata(null);
    try { setMetadata(await readJsonResponse(await fetch('/api/admin/bin-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bin: bin.trim() }), signal: AbortSignal.timeout(12000) })) as Metadata); }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo consultar el BIN.'); }
    finally { setBusy(false); }
  }
  return <div className="payment-tools-grid"><section className="admin-panel"><h2>Información de BIN</h2><p>Consulta la red, el emisor y el país asociados a los primeros 6 u 8 dígitos. Esta información no indica si una tarjeta está activa o tiene saldo.</p><form className="payment-tools-form" onSubmit={lookup}><label>Prefijo BIN<input type="text" inputMode="numeric" autoComplete="off" required pattern="(?:[0-9]{6}|[0-9]{8})" maxLength={8} value={bin} onPaste={event => { if (event.clipboardData.getData('text').trim().length > 8) { event.preventDefault(); setMetadata(null); setError('Introduce solo el prefijo de 6 u 8 dígitos, no una tarjeta completa.'); } }} onChange={event => { setBin(event.target.value); setMetadata(null); }} placeholder="6 u 8 dígitos"/></label><button className="button violet" disabled={busy}>{busy ? 'Consultando…' : 'Consultar información'}</button></form>{error && <p role="alert">{error}</p>}{metadata && (metadata.found ? <dl className="bin-metadata">{[['Red',metadata.scheme],['Tipo',metadata.type],['Marca',metadata.brand],['País',metadata.country],['Emisor',metadata.bank]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value || 'No disponible'}</dd></div>)}</dl> : <p role="status">El proveedor no tiene información para este prefijo.</p>)}<p className="admin-help">Fuente: <a href="https://binlist.net/" target="_blank" rel="noopener noreferrer">Binlist</a>. Los metadatos pueden estar incompletos o desactualizados.</p></section>
  <section className="admin-panel"><h2>Pruebas sandbox</h2><p>Simulación local con tarjetas de prueba publicadas por Stripe. No se conecta a una pasarela ni realiza cobros.</p><div className="payment-tools-form"><label>Escenario<select value={scenario} onChange={event => { setScenario(event.target.value); setResult(''); }}>{sandboxCards.map(value => <option key={value.id} value={value.id}>{value.label}</option>)}</select></label><div className="sandbox-fixture"><span>Tarjeta oficial de prueba</span><code>{card.number}</code><strong>SOLO SANDBOX</strong></div><button type="button" className="button violet" onClick={() => setResult(card.result)}>Simular escenario</button>{result && <p className={`sandbox-result sandbox-${card.state}`} role="status">{result}</p>}</div><a className="admin-text-link" href="https://docs.stripe.com/testing" target="_blank" rel="noopener noreferrer">Documentación oficial de pruebas de Stripe →</a></section></div>;
}

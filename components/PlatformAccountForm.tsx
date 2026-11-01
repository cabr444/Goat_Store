"use client";
import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { platformKeys, platformNames } from '@/lib/platform-account-options';
import { readJsonResponse } from '@/lib/json-response';
type Account = { id: string; platform: keyof typeof platformNames; email: string; createdAt: string; updatedAt: string };
type Accounts = { accounts: Account[]; count: number; page: number; pages: number };
export default function PlatformAccountForm() {
  const [data, setData] = useState<Accounts>({ accounts: [], count: 0, page: 1, pages: 1 });
  const [ready, setReady] = useState(false), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [includePasswords, setIncludePasswords] = useState(false), [exportBusy, setExportBusy] = useState(false), [exportError, setExportError] = useState('');
  async function load(page = 1) {
    setLoading(true); setLoadError('');
    try { const result = await readJsonResponse(await fetch(`/api/admin/platform-accounts?page=${page}`, { cache: 'no-store', signal: AbortSignal.timeout(15000) })); setData(result as Accounts); setReady(true); }
    catch (error) { setReady(false); setLoadError(error instanceof Error ? error.message : 'No se pudo consultar el registro.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function exportCSV() {
    setExportBusy(true); setExportError('');
    try {
      const response = await fetch('/api/admin/platform-accounts/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ includePasswords }), signal: AbortSignal.timeout(60000) });
      if (!response.ok) await readJsonResponse(response);
      const url = URL.createObjectURL(await response.blob()), link = document.createElement('a');
      link.href = url; link.download = 'cuentas-plataformas-goats.csv'; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setExportError(error instanceof Error ? error.message : 'No se pudo exportar el registro.'); }
    finally { setExportBusy(false); }
  }
  const date = (value: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(value));
  const [platform, setPlatform] = useState('prime'), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setFailed(false); setMessage('');
    try {
      await readJsonResponse(await fetch('/api/admin/platform-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform, email: email.trim(), password }), signal: AbortSignal.timeout(30000) }));
      setEmail(''); setPassword(''); setVisible(false); setMessage('Cuenta guardada correctamente.'); await load(1);
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'No se pudo guardar la cuenta.'); }
    finally { setBusy(false); }
  }
  return <><form className="admin-panel platform-account-form" onSubmit={submit}>
    <h2>Registrar cuenta</h2><p className="admin-help">Si ya existe el mismo correo en esa plataforma, se actualiza la contraseña.</p>
    <fieldset disabled={busy || !ready}><legend>Datos de la plataforma</legend>
      <label>Plataforma<select value={platform} onChange={event => setPlatform(event.target.value)}>{platformKeys.map(key => <option key={key} value={key}>{platformNames[key]}</option>)}</select></label>
      <label>Correo de la cuenta<input type="email" required maxLength={190} autoComplete="off" spellCheck={false} value={email} onChange={event => setEmail(event.target.value)} placeholder="correo@ejemplo.com"/></label>
      <label htmlFor="platform-account-password">Contraseña de la cuenta</label><div className="platform-password-field"><input id="platform-account-password" type={visible ? 'text' : 'password'} required maxLength={128} autoComplete="off" value={password} onChange={event => setPassword(event.target.value)}/><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div>
      <button type="submit" className="button violet full" disabled={busy}>{busy ? 'Guardando…' : 'Guardar / actualizar cuenta'}</button>
    </fieldset>
    {message && <p role={failed ? 'alert' : 'status'} className={`shared-account-feedback ${failed ? 'failed' : 'saved'}`}>{message}</p>}
  </form><section className="admin-panel"><h2>Cuentas guardadas</h2>
    {loadError && <p role="alert">{loadError}</p>}
    <div className="platform-register-tools"><button type="button" className="button outline" disabled={loading || busy} onClick={() => void load(data.page)}>Actualizar lista</button><label className="platform-export-option"><input type="checkbox" checked={includePasswords} onChange={event => setIncludePasswords(event.target.checked)}/>Incluir contraseñas en CSV</label><button type="button" className="button violet" disabled={!ready || exportBusy || busy || !data.count} onClick={() => void exportCSV()}>{exportBusy ? 'Preparando CSV…' : 'Exportar todas las cuentas'}</button></div>
    {includePasswords && <p className="admin-help">El archivo incluirá contraseñas legibles. Guárdalo en un lugar privado.</p>}
    {exportError && <p role="alert">{exportError}</p>}
    {loading ? <p role="status">Cargando registro…</p> : ready && <><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Plataforma</th><th>Correo</th><th>Registro</th><th>Actualización</th></tr></thead><tbody>{data.accounts.map(account => <tr key={account.id}><td>{platformNames[account.platform]}</td><td>{account.email}</td><td>{date(account.createdAt)}</td><td>{date(account.updatedAt)}</td></tr>)}</tbody></table></div>{!data.count && <p>Todavía no hay cuentas registradas.</p>}<nav className="admin-pagination" aria-label="Páginas de cuentas"><span>{data.count} cuentas · Página {data.page} de {data.pages}</span>{data.page > 1 && <button type="button" className="button outline" onClick={() => void load(data.page - 1)}>← Anterior</button>}{data.page < data.pages && <button type="button" className="button outline" onClick={() => void load(data.page + 1)}>Siguiente →</button>}</nav></>}
  </section></>;
}

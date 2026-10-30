"use client";
import { accountCategories, isAccountCategory } from "@/lib/account-categories";
import { readJsonResponse } from "@/lib/json-response";
import { useEffect, useRef, useState } from 'react';
import { isFullAccount, fullAccountProfile } from '@/lib/streaming-product-kind';
import { platformForProduct } from '@/lib/streaming-platform';
type Product = { id: string; name: string; category: string };
export default function SharedStreamingAccountEditor({ products, onSaved }: { products: Product[]; onSaved: () => Promise<void> }) {
  const [planQuery, setPlanQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]), [account, setAccount] = useState({ brand: 'STREAMING LT', email: '', password: '' });
  const [profiles, setProfiles] = useState([{ profile: '1', pin: '' }]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!message) return;
    feedback.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    if (failed) feedback.current?.focus({ preventScroll: true });
  }, [message, failed]);
  const plans = products.filter(product => isAccountCategory(product.category));
  const matchingPlans = [...plans].reverse().filter(product => [product.name, product.id, product.category].some(value => value.toLocaleLowerCase('es').includes(planQuery.trim().toLocaleLowerCase('es'))));
  const platform = selected.length ? platformForProduct(plans.find(product => product.id === selected[0])?.name || '') : '';
  const fullAccount = selected.length > 0 && isFullAccount(plans.find(product => product.id === selected[0])?.name || '');
  function selectPlan(product: Product, checked: boolean) {
    const next = checked ? [...selected, product.id] : selected.filter(id => id !== product.id);
    if (next.length && isFullAccount(plans.find(plan => plan.id === next[0])?.name || '')) setProfiles(current => [{ profile: fullAccountProfile, pin: current[0]?.pin || '' }]);
    else if (fullAccount) setProfiles([{ profile: '1', pin: '' }]);
    setSelected(next);
  }
  async function save() {
    setBusy(true); setMessage(''); setFailed(false);
    try {
      const response = await fetch('/api/admin/streaming-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productIds: selected, account: { ...account, email: account.email.trim() }, profiles }), signal: AbortSignal.timeout(45000) });
      const result = await readJsonResponse(response);
      setMessage(fullAccount ? `Cuentas completas añadidas: ${result.added}. Accesos vinculados a más planes: ${result.linked}. Cada cuenta se vende una sola vez.` : `${result.added} perfiles nuevos y ${result.linked} accesos vinculados a más planes. Cada acceso se vende una sola vez.`);
      setAccount({ brand: 'STREAMING LT', email: '', password: '' }); setProfiles([{ profile: fullAccount ? fullAccountProfile : '1', pin: '' }]);
      await onSaved();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'No se pudo guardar la cuenta.'); }
    finally { setBusy(false); }
  }
  return <section className="container shared-streaming-editor" id="cuentas-streaming"><h2>Una cuenta, varios planes</h2><p>Añade correo o ID numérico y clave una sola vez. Selecciona sus planes de Streaming, Música o Productividad (por ejemplo Netflix x20/x28/x33 o Chat GPT x20/x27) y hasta siete perfiles con PIN, o una cuenta completa como unidad única. Al vender un acceso, deja de estar disponible en todos los planes vinculados.</p>
    <p>Registra una cuenta por vez: un correo o ID numérico y su contraseña en campos separados. Los perfiles pertenecen a esa misma cuenta. Para otra cuenta, vuelve a completar el formulario.</p>
    <fieldset disabled={busy}><legend>Planes que ofrecen esta cuenta</legend><label>Buscar plan de cuenta<input type="search" value={planQuery} onChange={event => setPlanQuery(event.target.value)} placeholder="Nombre, categoría o ID del producto" /></label><p>Se incluyen las copias y los agotados, con los productos más recientes primero. Aparecen productos de Streaming, Música y Productividad. Si no encuentras uno, revisa su categoría en Productos e inventario.</p><div className="shared-account-groups">{accountCategories.map(category => {
      const categoryPlans = matchingPlans.filter(product => product.category === category);
      return <section className="shared-account-group" key={category} aria-label={`Planes de ${category}`}>
        <h3>{category} <span>({categoryPlans.length})</span></h3>
        <div className="shared-streaming-plans">{categoryPlans.map(product => <label key={product.id}><input type="checkbox" checked={selected.includes(product.id)} disabled={busy || (!selected.includes(product.id) && (selected.length >= 20 || Boolean(platform && platform !== platformForProduct(product.name)) || (selected.length > 0 && fullAccount !== isFullAccount(product.name))))} onChange={event => selectPlan(product, event.target.checked)} />{product.name}</label>)}</div>
        {!categoryPlans.length && <p>{planQuery.trim() ? "No hay planes que coincidan con la búsqueda en esta categoría." : "Todavía no hay productos en esta categoría."}</p>}
      </section>;
    })}</div>{!matchingPlans.length && plans.length > 0 && <p role="status">No hay planes que coincidan con la búsqueda.</p>}<p role="status">{selected.length} planes seleccionados. Con una selección activa, los planes de otra plataforma o tipo de cuenta quedan deshabilitados. Usa Cambiar selección de planes para elegir otra plataforma.</p><button type="button" className="button outline" disabled={busy || !selected.length} onClick={() => { setSelected([]); setProfiles([{profile:"1",pin:""}]); }}>Cambiar selección de planes</button>{!plans.length && <p>Primero crea productos de Streaming, Música o Productividad.</p>}
      <div className="shared-streaming-fields">{(['brand', 'email', 'password'] as const).map(field => <label key={field}>{({ brand: 'Encabezado del comprobante', email: 'Correo o ID numérico de la cuenta', password: 'Clave de la cuenta' })[field]}<input autoComplete="off" type={field === 'password' ? 'password' : 'text'} maxLength={field === 'email' ? 190 : field === 'password' ? 128 : 80} value={account[field]} onBlur={() => { if (field === "email") setAccount(current => ({ ...current, email: current.email.trim() })); }} onChange={event => setAccount({ ...account, [field]: event.target.value })} /></label>)}</div>
      <h3>{fullAccount ? "Cuenta completa · 1 unidad" : `Perfiles disponibles (${profiles.length}/7)`}</h3>{fullAccount && <p>Esta cuenta se vende completa una sola vez. No añadas sus perfiles a otros productos.</p>}{profiles.map((profile, index) => <div className="shared-streaming-profile" key={index}><label>Perfil<input readOnly={fullAccount} autoComplete="off" maxLength={60} value={profile.profile} onChange={event => setProfiles(profiles.map((row, i) => i === index ? { ...row, profile: event.target.value } : row))} /></label><label>PIN (opcional)<input autoComplete="off" maxLength={40} value={profile.pin} onChange={event => setProfiles(profiles.map((row, i) => i === index ? { ...row, pin: event.target.value } : row))} /></label>{!fullAccount && <button type="button" className="button outline" disabled={busy || profiles.length === 1} onClick={() => setProfiles(profiles.filter((_, i) => i !== index))}>Quitar perfil</button>}</div>)}
      {!fullAccount && <button type="button" className="button outline" disabled={busy || profiles.length >= 7} onClick={() => { let next = 1; while (profiles.some(row => row.profile === String(next))) next++; setProfiles([...profiles, { profile: String(next), pin: '' }]); }}>Añadir perfil</button>}
      <button type="button" className="button violet" disabled={busy || !selected.length || !account.brand.trim() || !account.email.trim() || !account.password || profiles.some(profile => !profile.profile.trim())} onClick={() => void save()}>{busy ? 'Guardando…' : 'Guardar cuenta y vincular planes'}</button>
      {message && <p ref={feedback} className={`shared-account-feedback ${failed ? 'failed' : 'saved'}`} role={failed ? 'alert' : 'status'} tabIndex={-1}>{failed && <strong>No se pudo guardar la cuenta. </strong>}{message}</p>}
    </fieldset><p>Si un perfil ya está disponible en otro plan, usa el mismo correo o ID numérico, perfil, clave y PIN para vincularlo sin duplicarlo. Los perfiles vendidos o retirados no se pueden reutilizar. Las claves y los PIN se guardan cifrados.</p></section>;
}

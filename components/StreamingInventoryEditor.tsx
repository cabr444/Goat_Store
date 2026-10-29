"use client";
import { fullAccountProfile } from "@/lib/streaming-product-kind";
import { useEffect, useRef, useState } from "react";
import { readJsonResponse } from "@/lib/json-response";
const empty = { brand: "STREAMING LT", email: "", password: "", profile: "", pin: "" };
type Access = { id: string; version: number; platform: string; productIds: string[]; delivery: typeof empty };
export default function StreamingInventoryEditor({ productId, onStockChange, onPendingChange }: { productId: string; onStockChange: (stock: number) => void; onPendingChange: (pending: boolean) => void }) {
  const [rows, setRows] = useState<Access[]>([]), [values, setValues] = useState(empty), [platform, setPlatform] = useState(""), [editing, setEditing] = useState<Access | null>(null);
  const [fullAccount, setFullAccount] = useState(false);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [message, setMessage] = useState(""), [available, setAvailable] = useState(0), [sold, setSold] = useState(0), [legacy, setLegacy] = useState(false);
  const [failed, setFailed] = useState(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!message) return;
    feedback.current?.scrollIntoView({ block: "nearest" });
    if (failed) feedback.current?.focus({ preventScroll: true });
  }, [message, failed]);
  const pending = busy || Boolean(editing) || Boolean(values.email || values.password || values.pin || (values.profile && values.profile !== fullAccountProfile) || values.brand !== empty.brand);
  useEffect(() => { onPendingChange(pending); }, [pending, onPendingChange]);
  useEffect(() => () => onPendingChange(false), [onPendingChange]);
  const endpoint = `/api/admin/products/${productId}/inventory`;
  async function load() {
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const data = await readJsonResponse(response);
    setFullAccount(Boolean(data.fullAccount));
    if (data.fullAccount) setValues(current => ({ ...current, profile: current.profile || fullAccountProfile }));
    setRows(data.accesses); setAvailable(data.available); setSold(data.sold); setLegacy(data.legacy); setPlatform(data.platform); onStockChange(data.available);
  }
  useEffect(() => { setLoading(true); void load().catch(error => { setFailed(true); setMessage(error.message); }).finally(() => setLoading(false)); }, [productId]);
  async function save(remove?: Access) {
    if (busy) return;
    if (remove && !window.confirm("¿Retirar este perfil de todos sus planes? Dejará de estar disponible y no podrá añadirse de nuevo.")) return;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      const target = remove || editing;
      const response = await fetch(endpoint, { method: remove ? "DELETE" : editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(remove ? { accessId: remove.id, version: remove.version } : { platform, delivery: values, ...(target ? { accessId: target.id, version: target.version } : {}) }), signal: AbortSignal.timeout(45000) });
      const data = await readJsonResponse(response);
      // The mutation response confirms persistence; publish its stock before refreshing details.
      setAvailable(data.stock); onStockChange(data.stock);
      setValues({ ...empty, profile: fullAccount ? fullAccountProfile : "" }); setEditing(null); await load(); setMessage(remove ? "Acceso retirado." : "Inventario actualizado. Cada acceso se vende una sola vez.");
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "No se pudo actualizar el inventario."); }
    finally { setBusy(false); }
  }
  return <fieldset className="delivery-editor" onKeyDown={event => {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
    }
  }}>
    <legend>Inventario privado de streaming</legend>
    <p>Los datos de la cuenta se guardan con el botón Añadir acceso al inventario (o Guardar cambios del acceso), no con Guardar producto.</p>
    <p>{fullAccount ? "Una cuenta completa equivale a una unidad. Se entrega una sola vez y no puede registrarse también por perfiles." : "Una fila por perfil disponible. Cada unidad comprada recibe un acceso distinto. Los perfiles vinculados a varios planes se venden una sola vez y se descuentan en todos ellos. El stock se calcula automáticamente."}</p>
    {legacy && <p>El antiguo acceso compartido ya no se entrega. Añade únicamente perfiles sin vender; los comprobantes anteriores se conservan.</p>}
    <p><strong>{available} disponibles · {sold} vendidos</strong></p>
    {loading ? <p role="status">Cargando inventario…</p> : <>
      <div className="streaming-inventory-list" aria-label="Accesos disponibles">
        {rows.map(row => <div className="streaming-inventory-row" key={row.id}>
          <span><strong>{row.platform}</strong> · {row.delivery.email} · Perfil {row.delivery.profile}{row.productIds.length > 0 && <small> · {row.productIds.length + 1} planes vinculados</small>}</span>
          <button type="button" disabled={busy} onClick={() => { setEditing(row); setPlatform(row.platform); setValues(row.delivery); setMessage(""); }}>Editar</button>
          <button type="button" disabled={busy} onClick={() => void save(row)}>Retirar</button>
        </div>)}
      </div>
      {available > rows.length && <p>Se muestran los primeros {rows.length} accesos disponibles.</p>}
      <h4>{editing ? "Editar acceso disponible" : fullAccount ? "Añadir una cuenta completa" : "Añadir un acceso individual"}</h4>
      <label>Plataforma (usa el mismo nombre en todos sus planes)<input disabled={busy || Boolean(editing)} maxLength={100} value={platform} onChange={event => setPlatform(event.target.value)} /></label>
      {(["brand", "email", "password", "profile", "pin"] as const).map(field => <label key={field}>
        {{ brand: "Encabezado del comprobante", email: "Correo o ID numérico de la plataforma", password: "Clave de la plataforma", profile: "Perfil", pin: "PIN (opcional)" }[field]}
        <input readOnly={fullAccount && field === "profile"} type={field === "password" ? "password" : "text"} disabled={busy || (Boolean(editing) && (field === "email" || field === "profile"))} autoComplete="off" value={values[field]} maxLength={field === "email" ? 190 : field === "password" ? 128 : field === "brand" ? 80 : field === "profile" ? 60 : 40} onChange={event => setValues({ ...values, [field]: event.target.value })} />
      </label>)}
      <button type="button" className="button violet full" disabled={busy || !platform.trim() || !values.email.trim() || !values.password || !values.profile.trim()} onClick={() => void save()}>{busy ? "Guardando…" : editing ? "Guardar cambios del acceso" : "Añadir acceso al inventario"}</button>
      {editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setValues({ ...empty, profile: fullAccount ? fullAccountProfile : "" }); }}>Cancelar edición</button>}
    </>}
    {message && <p ref={feedback} tabIndex={-1} className={`shared-account-feedback ${failed ? "failed" : "saved"}`} role={failed ? "alert" : "status"}>{message}</p>}
  </fieldset>;
}

"use client";
import { useEffect, useState } from "react";
const empty = { brand: "STREAMING LT", email: "", password: "", profile: "", pin: "" };
type Access = { id: string; version: number; platform: string; productIds: string[]; delivery: typeof empty };
export default function StreamingInventoryEditor({ productId, onStockChange }: { productId: string; onStockChange: (stock: number) => void }) {
  const [rows, setRows] = useState<Access[]>([]), [values, setValues] = useState(empty), [platform, setPlatform] = useState(""), [editing, setEditing] = useState<Access | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [message, setMessage] = useState(""), [available, setAvailable] = useState(0), [sold, setSold] = useState(0), [legacy, setLegacy] = useState(false);
  const endpoint = `/api/admin/products/${productId}/inventory`;
  async function load() {
    const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || "No se pudo consultar el inventario.");
    setRows(data.accesses); setAvailable(data.available); setSold(data.sold); setLegacy(data.legacy); setPlatform(data.platform); onStockChange(data.available);
  }
  useEffect(() => { setLoading(true); void load().catch(error => setMessage(error.message)).finally(() => setLoading(false)); }, [productId]);
  async function save(remove?: Access) {
    if (busy) return;
    if (remove && !window.confirm("¿Retirar este perfil de todos sus planes? Dejará de estar disponible y no podrá añadirse de nuevo.")) return;
    setBusy(true); setMessage("");
    try {
      const target = remove || editing;
      const response = await fetch(endpoint, { method: remove ? "DELETE" : editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(remove ? { accessId: remove.id, version: remove.version } : { platform, delivery: values, ...(target ? { accessId: target.id, version: target.version } : {}) }), signal: AbortSignal.timeout(45000) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "No se pudo guardar el acceso.");
      setValues(empty); setEditing(null); await load(); setMessage(remove ? "Acceso retirado." : "Inventario actualizado. Cada acceso se vende una sola vez.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo actualizar el inventario."); }
    finally { setBusy(false); }
  }
  return <fieldset className="delivery-editor">
    <legend>Inventario privado de streaming</legend>
    <p>Una fila por perfil disponible. Cada unidad comprada recibe un acceso distinto. Los perfiles vinculados a varios planes se venden una sola vez y se descuentan en todos ellos. El stock se calcula automáticamente.</p>
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
      <h4>{editing ? "Editar acceso disponible" : "Añadir un acceso individual"}</h4>
      <label>Plataforma (usa el mismo nombre en todos sus planes)<input disabled={busy || Boolean(editing)} maxLength={100} value={platform} onChange={event => setPlatform(event.target.value)} /></label>
      {(["brand", "email", "password", "profile", "pin"] as const).map(field => <label key={field}>
        {{ brand: "Encabezado del comprobante", email: "Correo o ID numérico de la plataforma", password: "Clave de la plataforma", profile: "Perfil", pin: "PIN (opcional)" }[field]}
        <input type={field === "password" ? "password" : "text"} disabled={busy || (Boolean(editing) && (field === "email" || field === "profile"))} autoComplete="off" value={values[field]} maxLength={field === "email" ? 190 : field === "password" ? 128 : field === "brand" ? 80 : field === "profile" ? 60 : 40} onChange={event => setValues({ ...values, [field]: event.target.value })} />
      </label>)}
      <button type="button" className="button violet full" disabled={busy || !platform.trim() || !values.email.trim() || !values.password || !values.profile.trim()} onClick={() => void save()}>{busy ? "Guardando…" : editing ? "Guardar cambios del acceso" : "Añadir acceso al inventario"}</button>
      {editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setValues(empty); }}>Cancelar edición</button>}
    </>}
    {message && <p role="status">{message}</p>}
  </fieldset>;
}

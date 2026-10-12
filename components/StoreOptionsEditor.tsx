"use client";
import { useState } from "react";
import type { StoreOptions } from "@/lib/store-settings";

export default function StoreOptionsEditor({ options, onChange }: { options: StoreOptions; onChange: (value: StoreOptions) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function toggle(department: "tienda" | "segunda", enabled: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/store-options", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department, enabled }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "No se pudo guardar la opción.");
      onChange(data.storeOptions);
      setMessage("Configuración guardada para los clientes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally { setBusy(false); }
  }
  return <section className="container store-options-editor">
    <span className="overline">ADMINISTRACIÓN</span>
    <h2>Secciones disponibles para clientes</h2>
    <p>Al deshabilitar una sección se oculta su enlace y se bloquean el acceso y las nuevas compras de los clientes. Administradores y vendedores conservan el acceso; los pedidos anteriores siguen disponibles.</p>
    <div className="store-options-grid">
      {(["tienda", "segunda"] as const).map(department => {
        const enabled = department === "tienda" ? options.tiendaEnabled : options.segundaEnabled;
        const label = department === "tienda" ? "Tienda" : "Segunda";
        return <article key={department}>
          <div><strong>{label}</strong><p>{enabled ? "Habilitada para clientes" : "Deshabilitada para clientes"}</p></div>
          <button type="button" className={"button " + (enabled ? "dark" : "violet")} disabled={busy} onClick={() => void toggle(department, !enabled)} aria-label={(enabled ? "Deshabilitar " : "Habilitar ") + label}>
            {enabled ? "Deshabilitar" : "Habilitar"}
          </button>
        </article>;
      })}
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}

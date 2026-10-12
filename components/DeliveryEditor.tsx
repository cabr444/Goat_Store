"use client";
import { useEffect, useState } from "react";
const empty = {
  brand: "STREAMING LT",
  email: "",
  password: "",
  profile: "",
  pin: "",
};
export default function DeliveryEditor({ productId }: { productId: string }) {
  const [values, setValues] = useState(empty),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    setValues(empty);
    setMessage("");
    void (async () => {
      try {
        const response = await fetch(
          "/api/admin/products/" + productId + "/delivery",
          { cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        if (alive) setValues(data.delivery || empty);
      } catch (e) {
        if (alive)
          setMessage(
            e instanceof Error ? e.message : "No se pudo consultar el acceso.",
          );
      }
    })();
    return () => {
      alive = false;
    };
  }, [productId]);
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        "/api/admin/products/" + productId + "/delivery",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setMessage("Acceso guardado. Se entregará en futuras compras.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No se pudo guardar el acceso.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset className="delivery-editor">
      <legend>Acceso privado de streaming</legend>
      <p>
        Solo el administrador puede ver y editar estos datos. Se entregan al
        comprador al pagar. El mismo acceso se entrega a cada unidad de este
        producto. Para un perfil único, usa stock 1.
      </p>
      {(["brand", "email", "password", "profile", "pin"] as const).map(
        (field) => (
          <label key={field}>
            {
              {
                brand: "Encabezado del comprobante",
                email: "Correo de la plataforma",
                password: "Clave de la plataforma",
                profile: "Perfil",
                pin: "PIN (opcional)",
              }[field]
            }
            <input
              type={
                field === "password"
                  ? "password"
                  : field === "email"
                    ? "email"
                    : "text"
              }
              value={values[field]}
              autoComplete="off"
              maxLength={
                field === "email"
                  ? 190
                  : field === "password"
                    ? 128
                    : field === "brand"
                      ? 80
                      : field === "profile"
                        ? 60
                        : 40
              }
              onChange={(e) =>
                setValues({ ...values, [field]: e.target.value })
              }
            />
          </label>
        ),
      )}
      <button
        type="button"
        className="button violet full"
        disabled={busy}
        onClick={() => void save()}
      >
        {busy ? "Guardando acceso…" : "Guardar acceso privado"}
      </button>
      {message && <p role="status">{message}</p>}
    </fieldset>
  );
}

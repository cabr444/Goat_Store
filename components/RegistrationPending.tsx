"use client";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";

export type PendingRegistrationInfo = { ticket: string; email: string; expiresAt: string };
export default function RegistrationPending({ info, onConfirmed, onBack }: { info: PendingRegistrationInfo; onConfirmed: () => void; onBack: () => void }) {
  const [expiresAt, setExpiresAt] = useState(info.expiresAt);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const cooldown = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - 29 * 60000 - now) / 1000));
  useEffect(() => {
    let alive = true, checking = false;
    async function check() {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      try {
        const response = await fetch("/api/auth/registration-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket: info.ticket }) });
        const data = await response.json();
        if (alive && response.ok) {
          if (data.status === "confirmed") onConfirmed();
          else setExpired(data.status === "expired");
        }
      } catch { /* The email link still works if this tab temporarily loses connection. */ }
      finally { checking = false; }
    }
    void check();
    const poll = window.setInterval(check, 10000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("focus", check);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); window.removeEventListener("focus", check); };
  }, [info.ticket, onConfirmed]);
  async function resend() {
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticket: info.ticket }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "No se pudo reenviar el correo.");
      setExpiresAt(data.expiresAt); setExpired(false); setNow(Date.now());
      try { sessionStorage.setItem("goat-pending-registration", JSON.stringify({ ...info, expiresAt: data.expiresAt })); } catch {}
      setMessage("Correo reenviado. Usa el enlace más reciente.");
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo reenviar."); }
    finally { setBusy(false); }
  }
  return <section className="registration-pending">
    <div className="access-lock"><MailCheck size={25} /></div>
    <h2>Confirma tu correo</h2>
    <p>Enviamos un enlace de confirmación a <strong>{info.email}</strong>.</p>
    <div className="registration-wait" role="status"><span aria-hidden="true" />{expired ? "El enlace venció o ya no está disponible." : "Esperando la confirmación de tu correo…"}</div>
    <p>Tu cuenta todavía no está creada. Abre el correo y pulsa <strong>Confirmar correo y crear cuenta</strong>. El enlace vence en 30 minutos.</p>
    <p className="registration-help">Revisa también spam o correo no deseado.</p>
    <button type="button" className="button violet full" disabled={busy || cooldown > 0} onClick={() => void resend()}>{busy ? "Enviando…" : cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar confirmación"}</button>
    <button type="button" className="button outline full" onClick={onBack}>Volver a iniciar sesión</button>
    {message && <p role="status">{message}</p>}
    {error && <div className="auth-error" role="alert">{error}</div>}
  </section>;
}

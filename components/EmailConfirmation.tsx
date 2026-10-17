"use client";
import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function EmailConfirmation({ token }: { token: string }) {
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [error, setError] = useState("");
  const valid = /^[a-f0-9]{64}$/.test(token);
  async function confirm() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "No se pudo confirmar el correo.");
      setDone(true);
    } catch (error) { setError(error instanceof Error ? error.message : "No se pudo confirmar."); }
    finally { setBusy(false); }
  }
  return <main className="email-confirmation-screen"><section className="access-card">
    <Link href="/acceso" className="logo">Goat<span>.</span></Link>
    <div className="access-lock"><MailCheck size={25} /></div>
    <h1>{done ? "¡Correo confirmado!" : "Confirma tu correo"}</h1>
    <p>{done ? "Tu cuenta ya fue creada. Puedes iniciar sesión con el correo y la contraseña que elegiste." : "Confirma que este correo es tuyo para terminar de crear tu cuenta en Goat."}</p>
    {!valid && <div className="auth-error" role="alert">El enlace no es válido. Solicita un nuevo correo desde el registro.</div>}
    {error && <div className="auth-error" role="alert">{error}</div>}
    {!done && valid && <button type="button" className="button violet full" disabled={busy} onClick={() => void confirm()}>{busy ? "Confirmando…" : "Confirmar correo y crear cuenta"}</button>}
    <Link className={"button full " + (done ? "violet" : "outline")} href="/acceso">Ir a iniciar sesión</Link>
  </section></main>;
}

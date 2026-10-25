import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Registro | Goats", robots: { index: false, follow: false } };
export default function Page() {
  return <main className="email-confirmation-screen"><section className="access-card">
    <h1>Regístrate directamente</h1>
    <p>Ya no necesitas confirmar tu correo. Si tu cuenta había quedado pendiente, vuelve al registro y créala con la contraseña que quieras usar.</p>
    <Link className="button violet full" href="/acceso">Ir a iniciar sesión o registrarse</Link>
  </section></main>;
}

import Access from "@/components/Access";
import type { Metadata } from "next";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    return (
      <main className="access-screen">
        <div className="access-panel">
          <section className="access-card">
            <h2>Enlace inválido</h2>
            <p>Solicita un nuevo enlace para restablecer tu contraseña.</p>
            <a href="/acceso?recuperar=1">Volver al acceso</a>
          </section>
        </div>
      </main>
    );
  return <Access resetToken={token} />;
}

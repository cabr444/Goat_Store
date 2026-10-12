import { redirect } from "next/navigation";
import {
  Wallet,
  ShoppingBag,
  CalendarDays,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { getProfileData, cop, accountDate } from "@/lib/account";
import { rechargeLink, supportLink } from "@/lib/account-links";
import AccountHeader from "@/components/AccountHeader";
import CatalogImage from "@/components/CatalogImage";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Mi perfil | Goat",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await getUser();
  if (!user) redirect("/acceso");
  const data = await getProfileData(user.id, user.role);
  const { profile } = data;
  function recent(
    items: typeof data.bought,
    title: string,
    empty: string,
    sales = false,
  ) {
    return (
      <section className="profile-list">
        <div className="account-section-heading">
          <h2>{title}</h2>
          <span>Últimos {items.length} productos</span>
        </div>
        {items.length ? (
          <div className="account-product-list">
            {items.map((item) => (
              <div key={item.id} className="account-product-row">
                <CatalogImage
                  name={item.name}
                  category={item.category || item.product.category}
                />
                <div>
                  <strong>
                    {sales ? (
                      item.name
                    ) : (
                      <a href={"/pedidos#pedido-" + item.order.id}>
                        {item.name}
                      </a>
                    )}
                  </strong>
                  <p>
                    {accountDate(item.order.createdAt)} · {item.quantity} unidad
                    {item.quantity !== 1 ? "es" : ""}
                  </p>
                  <small>{item.order.status.replaceAll("_", " ")}</small>
                </div>
                <strong>{cop(item.unitPrice * item.quantity)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="account-empty">{empty}</p>
        )}
      </section>
    );
  }
  return (
    <>
      <AccountHeader name={profile.name} balance={profile.balance} />
      <main className="container account-dashboard">
        <a href="/" className="account-back">
          ← Volver a Inicio
        </a>
        <div className="account-title">
          <div>
            <span className="overline">MI CUENTA GOAT</span>
            <h1>Hola, {profile.name}.</h1>
            <p>Tu perfil, saldo y actividad en un solo lugar.</p>
          </div>
          <a
            className="button violet"
            href={rechargeLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Recargar saldo <ArrowUpRight size={17} />
          </a>
        </div>
        <section className="account-stats" aria-label="Resumen de cuenta">
          <article>
            <Wallet />
            <span>Saldo disponible</span>
            <strong>{cop(profile.balance)}</strong>
          </article>
          <article>
            <TrendingUp />
            <span>Total gastado</span>
            <strong>{cop(data.totalSpent)}</strong>
          </article>
          <article>
            <ShoppingBag />
            <span>Pedidos realizados</span>
            <strong>{data.orderCount}</strong>
          </article>
          <article>
            <CalendarDays />
            <span>Fecha de registro</span>
            <strong className="date-stat">
              {accountDate(profile.createdAt)}
            </strong>
          </article>
        </section>
        <section className="account-profile-details">
          <h2>Información del perfil</h2>
          <dl>
            <div>
              <dt>Nombre</dt>
              <dd>{profile.name}</dd>
            </div>
            <div>
              <dt>Correo electrónico</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Tipo de cuenta</dt>
              <dd>{profile.role.toLowerCase()}</dd>
            </div>
            <div>
              <dt>Miembro desde</dt>
              <dd>{accountDate(profile.createdAt)}</dd>
            </div>
          </dl>
        </section>
        {recent(
          data.bought,
          "Últimos productos comprados",
          "Aún no has comprado productos.",
        )}{" "}
        {profile.role !== "CLIENTE" &&
          recent(
            data.sold,
            profile.role === "ADMIN"
              ? "Últimos productos vendidos por la tienda"
              : "Últimos productos vendidos",
            "Aún no hay ventas para mostrar.",
            true,
          )}
        <div className="account-footer-links">
          <a href="/pedidos">Ver todos mis pedidos →</a>
          <a href={supportLink} target="_blank" rel="noopener noreferrer">
            Necesito soporte →
          </a>
        </div>
      </main>
    </>
  );
}

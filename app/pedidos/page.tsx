import { getStoreOptions } from "@/lib/store-settings";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import {
  getOrderHistory,
  orderSections,
  orderDepartment,
  departmentLabels,
  cop,
  accountDate,
  type OrderSection,
} from "@/lib/account";
import AccountHeader from "@/components/AccountHeader";
import ReceiptModal from "@/components/ReceiptModal";
import PurchaseReceipt from "@/components/PurchaseReceipt";
import CatalogImage from "@/components/CatalogImage";
import { supportLink } from "@/lib/account-links";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Mis pedidos | Goat",
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; pagina?: string; pedido?: string; comprobante?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/acceso");
  const params = await searchParams;
  const section: OrderSection = orderSections.includes(
    params.tipo as OrderSection,
  )
    ? (params.tipo as OrderSection)
    : "todos";
  const requestedPage =
    params.pagina && /^\d{1,6}$/.test(params.pagina)
      ? Number(params.pagina)
      : 1;
  const selectedOrder =
    params.pedido && /^[a-zA-Z0-9-]{1,80}$/.test(params.pedido)
      ? params.pedido
      : undefined;
  const storeOptions = await getStoreOptions();
  const canBrowseTienda = user.role !== "CLIENTE" || storeOptions.tiendaEnabled;
  const data = await getOrderHistory(
    user.id,
    section,
    requestedPage,
    selectedOrder,
  );
  const pageLink = (page: number) =>
    "/pedidos?tipo=" + section + "&pagina=" + page;
  return (
    <>
      {params.comprobante === "1" && selectedOrder && data.orders[0] && (
        <ReceiptModal reference={data.orders[0].reference || data.orders[0].id} date={accountDate(data.orders[0].createdAt)} total={cop(data.orders[0].total)} items={data.orders[0].items.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, amount: cop(item.unitPrice * item.quantity), receipt: item.receipt }))} />
      )}
      <AccountHeader name={user.name} balance={user.balance} role={user.role} storeOptions={storeOptions} />
      <main className="container account-dashboard">
        <a href="/" className="account-back">
          ← Volver a Inicio
        </a>
        <div className="account-title">
          <div>
            <span className="overline">MIS COMPRAS</span>
            <h1>Mis pedidos</h1>
            <p>Consulta tus compras, sus productos y su estado de entrega.</p>
          </div>
          <a
            className="button outline"
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Necesito soporte
          </a>
        </div>
        <nav className="order-filters" aria-label="Tipo de pedido">
          {orderSections.map((type) => (
            <a
              key={type}
              href={"/pedidos?tipo=" + type}
              aria-current={section === type ? "page" : undefined}
            >
              {type === "todos" ? "Todos los pedidos" : departmentLabels[type]}
            </a>
          ))}
        </nav>
        {selectedOrder && (
          <a className="account-back" href="/pedidos">
            ← Ver todos mis pedidos
          </a>
        )}
        <p className="order-count">
          {data.total} pedido{data.total !== 1 ? "s" : ""} · Página {data.page}{" "}
          de {data.pages}
        </p>
        <div className="order-history">
          {data.orders.length ? (
            data.orders.map((order) => (
              <article
                id={"pedido-" + order.id}
                className="order-card"
                key={order.id}
              >
                <header>
                  <div>
                    <span className="overline">
                      PEDIDO #{order.reference || order.id.slice(-8).toUpperCase()}
                    </span>
                    <p>{accountDate(order.createdAt)}</p>
                  </div>
                  <span className="order-status">
                    {order.status.replaceAll("_", " ")}
                  </span>
                  <strong>{cop(order.total)}</strong>
                </header>
                <details open={selectedOrder === order.id}>
                  <summary>
                    Ver detalle del pedido{" "}
                    <span>
                      {order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      )}{" "}
                      productos
                    </span>
                  </summary>
                  <p className="order-reference">
                    Referencia completa: {order.id}
                  </p>
                  {(["streaming", "tienda", "segunda", "cursos"] as const).map(
                    (department) => {
                      const items = order.items.filter(
                        (item) =>
                          orderDepartment(
                            item.category || item.product.category,
                          ) === department,
                      );
                      return items.length ? (
                        <section className="order-item-group" key={department}>
                          <h3>{departmentLabels[department]}</h3>
                          {items.map((item) => (
                            <div className="order-delivery-item" key={item.id}>
                              <div
                                className="account-product-row"
                                key={item.id}
                              >
                                <CatalogImage
                                  productId={item.productId}
                                  name={item.name}
                                  category={
                                    item.category || item.product.category
                                  }
                                />
                                <div>
                                  <strong>{item.name}</strong>
                                  <p>
                                    {item.quantity} × {cop(item.unitPrice)}
                                  </p>
                                </div>
                                <strong>
                                  {cop(item.unitPrice * item.quantity)}
                                </strong>
                              </div>
                              {item.receipt && (
                                <PurchaseReceipt text={item.receipt} />
                              )}
                            </div>
                          ))}
                          <p className="order-group-total">
                            Subtotal {departmentLabels[department]}{" "}
                            <strong>
                              {cop(
                                items.reduce(
                                  (sum, item) =>
                                    sum + item.unitPrice * item.quantity,
                                  0,
                                ),
                              )}
                            </strong>
                          </p>
                        </section>
                      ) : null;
                    },
                  )}
                  <p className="order-delivery">
                    Estado: {order.status.replaceAll("_", " ")}. La entrega se
                    gestiona con la administración.
                  </p>
                </details>
              </article>
            ))
          ) : (
            <div className="account-empty">
              <h2>Aún no hay pedidos aquí.</h2>
              <p>Tus compras aparecerán en esta sección.</p>
              <a href={canBrowseTienda ? "/store" : "/"}>{canBrowseTienda ? "Explorar Tienda →" : "Explorar streaming →"}</a>
            </div>
          )}
        </div>
        {data.pages > 1 && (
          <nav className="order-pagination" aria-label="Páginas de pedidos">
            {data.page > 1 && <a href={pageLink(data.page - 1)}>← Anterior</a>}
            <span>
              {data.page} / {data.pages}
            </span>
            {data.page < data.pages && (
              <a href={pageLink(data.page + 1)}>Siguiente →</a>
            )}
          </nav>
        )}
      </main>
    </>
  );
}

"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supportLink } from "@/lib/account-links";
import { emptyCardOrders, sortCards, type CardOrders } from "@/lib/catalog-order";
import StreamingHighlights from "@/components/StreamingHighlights";
import StoreOptionsEditor from "@/components/StoreOptionsEditor";
import type { StoreOptions } from "@/lib/store-settings";
import CategoryImageManager from "@/components/CategoryImageManager";
import DeliveryEditor from "@/components/DeliveryEditor";
import ImageUploadButton from "@/components/ImageUploadButton";
import ProfileMenu from "@/components/ProfileMenu";
import CatalogImage from "@/components/CatalogImage";
import { BannerBackground, BannerEditor } from "@/components/BannerImages";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LogOut,
  Plus,
  ShoppingBag,
  Trash2,
  Wallet,
  Menu,
  X,
  Search,
  Pencil,
  Sparkles,
} from "lucide-react";
import {
  technologyCategories,
  digitalCategories,
  allCategories,
} from "@/lib/technology-products";
import { secondhandCategories } from "@/lib/secondhand-products";

type Role = "CLIENTE" | "VENDEDOR" | "ADMIN";
type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  balance: number;
};
type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  mark: string;
  gradient: string;
  ownerId: string | null;
};
type CartItem = { id: string; qty: number };
type Entry = {
  expectedStock?: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  mark: string;
  active: boolean;
};
const fresh = (): Entry => ({
  name: "",
  category: "Streaming",
  price: 0,
  stock: 0,
  description: "",
  mark: "✦",
  active: true,
});
const cop = (v: number) => "$" + new Intl.NumberFormat("es-CO").format(v);
async function request(url: string, method = "GET", body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Ocurrió un error");
  return d;
}
export default function Storefront({
  technology = false,
  secondhand = false,
  management = false,
  digitalCatalog = false,
  initialCategory = "Todos",
  initialQuery = "",
}: {
  technology?: boolean;
  secondhand?: boolean;
  management?: boolean;
  digitalCatalog?: boolean;
  initialCategory?: string;
  initialQuery?: string;
}) {
  const home = !technology && !secondhand && !management && !digitalCatalog;
  const catalogCategories: readonly string[] = management
    ? allCategories
    : secondhand
      ? secondhandCategories
      : technology
        ? technologyCategories
        : digitalCategories;
  const router = useRouter();
  const [cardOrders, setCardOrders] = useState<CardOrders>(emptyCardOrders);
  const [reorderMode, setReorderMode] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [dragged, setDragged] = useState<{kind: "products" | "categories"; id: string} | null>(null);
  const [user, setUser] = useState<User | null>(null),
    [products, setProducts] = useState<Product[]>([]),
    [catalogLoading, setCatalogLoading] = useState(true),
    [storeOptions, setStoreOptions] = useState<StoreOptions>({ tiendaEnabled: true, segundaEnabled: true }),
    [filter, setFilter] = useState(initialCategory),
    [query, setQuery] = useState(initialQuery),
    [cart, setCart] = useState<CartItem[]>([]),
    [cartReady, setCartReady] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [menu, setMenu] = useState(false),
    [editor, setEditor] = useState(false),
    [editId, setEditId] = useState<string | null>(null),
    [form, setForm] = useState<Entry>(fresh()),
    [users, setUsers] = useState<User[]>([]),
    [creditId, setCreditId] = useState(""),
    [credit, setCredit] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [orders, setOrders] = useState<
      { id: string; total: number; status: string }[]
    >([]);
  const load = async () => {
    const data = await request("/api/storefront");
    setUser(data.user);
    setProducts(data.products);
    setUsers(data.users);
    setOrders(data.orders);
    setStoreOptions(data.storeOptions);
    setCardOrders(data.cardOrders);
  };
  useEffect(() => {
    load().catch((e) => setNotice(e.message)).finally(() => setCatalogLoading(false));
    try {
      const data = JSON.parse(localStorage.getItem("goat-cart-v3") || "[]");
      if (Array.isArray(data))
        setCart(
          data.filter(
            (i: CartItem) =>
              typeof i.id === "string" && Number.isInteger(i.qty) && i.qty > 0,
          ),
        );
    } catch {}
    setCartReady(true);
  }, []);
  useEffect(() => {
    if (cartReady) localStorage.setItem("goat-cart-v3", JSON.stringify(cart));
  }, [cart, cartReady]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || reorderMode) return;
      void request("/api/products")
        .then((data) => {
          setProducts(data.products);
          setCardOrders(data.cardOrders);
          setStoreOptions(data.storeOptions);
          if (user?.role === "CLIENTE" && ((technology && !data.storeOptions.tiendaEnabled) || (secondhand && !data.storeOptions.segundaEnabled))) router.replace("/");
        })
        .catch(() => {});
    }, 15000);
    return () => window.clearInterval(timer);
  }, [user?.role, technology, secondhand, router, reorderMode]);
  const visible = useMemo(
    () =>
      sortCards(products.filter(
        (p) =>
          catalogCategories.includes(p.category) &&
          (!home || p.category === "Streaming") &&
          (filter === "Todos" || p.category === filter) &&
          p.name
            .toLocaleLowerCase("es")
            .includes(query.toLocaleLowerCase("es")),
      ), cardOrders.products.ids, p => p.id),
    [products, cardOrders, filter, query, technology, secondhand, management, home],
  );
  const orderedCategories = sortCards(catalogCategories, cardOrders.categories.ids, category => category);
  async function move(kind: "products" | "categories", id: string, target: string, position: "before" | "after") {
    if (user?.role !== "ADMIN" || !reorderMode || orderBusy || id === target) return;
    setOrderBusy(true);
    try {
      const result = await request("/api/admin/card-order", "PUT", {kind, id, target, position, version: cardOrders[kind].version});
      setCardOrders(old => ({...old, [kind]: result.order}));
      setNotice("Orden guardado para todos.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo guardar el orden."); }
    finally { setOrderBusy(false); setDragged(null); }
  }
  const orderControls = (kind: "products" | "categories", id: string, label: string, ids: string[]) => {
    if (user?.role !== "ADMIN" || !reorderMode) return null;
    const index = ids.indexOf(id);
    return <div className="card-order-controls">
      <span aria-hidden="true">⠿</span>
      <button type="button" disabled={orderBusy || index <= 0} aria-label={"Mover " + label + " antes"} onClick={() => void move(kind, id, ids[index - 1], "before")}>←</button>
      <button type="button" disabled={orderBusy || index >= ids.length - 1} aria-label={"Mover " + label + " después"} onClick={() => void move(kind, id, ids[index + 1], "after")}>→</button>
    </div>;
  };
  const dragProps = (kind: "products" | "categories", id: string) => ({
    draggable: user?.role === "ADMIN" && reorderMode && !orderBusy,
    onDragStart: (event: React.DragEvent) => { setDragged({kind, id}); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); },
    onDragEnd: () => setDragged(null),
    onDragOver: (event: React.DragEvent) => { if (dragged?.kind === kind && !orderBusy) event.preventDefault(); },
    onDrop: (event: React.DragEvent) => { event.preventDefault(); if (dragged?.kind === kind) void move(kind, dragged.id, id, "before"); },
  });
  const total = cart.reduce(
    (s, i) => s + (products.find((p) => p.id === i.id)?.price || 0) * i.qty,
    0,
  );
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const canManage = user?.role === "ADMIN" || user?.role === "VENDEDOR";
  const updateQty = (id: string, delta: number) =>
    setCart((old) =>
      old
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );
  const add = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product || product.stock === 0) {
      setNotice("Producto agotado.");
      return;
    }
    if (
      (cart.find((item) => item.id === id)?.qty || 0) >=
      Math.min(50, product.stock)
    ) {
      setNotice("No hay más unidades disponibles.");
      return;
    }
    setCart((old) =>
      old.some((i) => i.id === id)
        ? old.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i))
        : [...old, { id, qty: 1 }],
    );
    setNotice("Producto agregado al carrito");
  };
  const jump = (cat: string) => {
    if (home && cat !== "Streaming") {
      router.push("/catalogo?categoria=" + encodeURIComponent(cat));
      return;
    }
    setFilter(cat);
    setMenu(false);
    document
      .getElementById("catalogo")
      ?.scrollIntoView({ behavior: "smooth" });
  };
  async function logout() {
    await request("/api/auth/logout", "POST");
    router.replace("/acceso");
    router.refresh();
  }
  function startEdit(p?: Product) {
    setEditId(p?.id || null);
    setForm(
      p
        ? {
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.stock,
            expectedStock: p.stock,
            description: p.description,
            mark: p.mark,
            active: true,
          }
        : {
            ...fresh(),
            category: secondhand
              ? "Tecnología usada"
              : technology
                ? "Computadores"
                : "Streaming",
          },
    );
    setEditor(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request(
        editId ? `/api/products/${editId}` : "/api/products",
        editId ? "PATCH" : "POST",
        form,
      );
      setNotice(editId ? "Producto actualizado" : "Producto creado");
      setEditor(false);
      await load();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(p: Product) {
    if (!confirm(`¿Marcar ${p.name} como agotado?`)) return;
    try {
      await request(`/api/products/${p.id}`, "DELETE");
      setNotice("Producto marcado como agotado");
      await load();
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function recharge(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await request("/api/admin/recharge", "POST", {
        userId: creditId,
        amount: Number(credit),
        note: "Recarga manual desde panel Goat",
      });
      setCredit("");
      setNotice("Saldo recargado correctamente");
      await load();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function checkout() {
    setBusy(true);
    try {
      const result = await request("/api/orders", "POST", { items: cart });
      setCart([]);
      setCartOpen(false);
      setNotice(
        `Pedido ${result.reference || result.orderId} registrado. Consulta el comprobante en Pedidos.`,
      );
      router.push("/pedidos?pedido=" + encodeURIComponent(result.orderId) + "&comprobante=1");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="announcement">
        {secondhand
          ? "✦ GOAT SEGUNDA — Una nueva vida para tus favoritos"
          : technology
            ? "✦ GOAT TIENDA — Tecnología para tu día a día"
            : "✦ Bienvenido a GOAT — Streaming, música, productividad y combos"}
      </div>
      <header className="header">
        <div className="container nav">
          <a className="logo" href={technology || secondhand || digitalCatalog || management ? "/" : "#inicio"}>
            Goat<span>.</span>
          </a>
          <nav className={`navlinks ${menu ? "expanded" : ""}`}>
            <a
              href={technology || secondhand || digitalCatalog || management ? "/#inicio" : "#inicio"}
              onClick={() => setMenu(false)}
            >
              Inicio
            </a>
            <Link
              href={home ? "#catalogo" : "/catalogo?categoria=Streaming"}
              onClick={() => setMenu(false)}
            >
              Streaming
            </Link>
            <Link
              href="/catalogo?categoria=Combos"
              onClick={() => setMenu(false)}
            >
              Combos
            </Link>
            {user && (user.role !== "CLIENTE" || storeOptions.tiendaEnabled) && <a
              href="/store"
              aria-current={technology ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              Tienda
            </a>}
            {user && (user.role !== "CLIENTE" || storeOptions.segundaEnabled) && <a
              href="/segunda"
              aria-current={secondhand ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              Segunda
            </a>}
            <a href="#contacto" onClick={() => setMenu(false)}>
              Contacto
            </a>
          </nav>
          <div className="actions">
            <span className="balance-chip">
              <Wallet size={17} />
              {cop(user?.balance || 0)}
            </span>
            <ProfileMenu name={user?.name} />
            <button
              className="icon-button"
              title="Carrito"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={21} />
              {count > 0 && <span className="count">{count}</span>}
            </button>
            <button
              className="icon-button"
              title="Cerrar sesión"
              onClick={logout}
            >
              <LogOut size={20} />
            </button>
            <button
              className="icon-button mobile-toggle"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="inicio">
        {user?.role === "ADMIN" && <div className="container card-order-toolbar">
          <button type="button" className="button violet" aria-pressed={reorderMode} disabled={orderBusy} onClick={() => setReorderMode(!reorderMode)}>{reorderMode ? "Terminar de ordenar" : "Ordenar tarjetas"}</button>
          {reorderMode && <p>Arrastra las tarjetas o usa las flechas para moverlas. Cada movimiento se guarda para todos.</p>}
        </div>}

        {!digitalCatalog && (
        <section
          className={
            "container hero " +
            (!technology && !secondhand && !management ? "hero-slideshow" : "")
          }
        >
          {!technology && !secondhand && !management && <BannerBackground />}
          <div className="hero-copy">
            <span className="eyebrow">
              <Sparkles size={16} />{" "}
              {secondhand
                ? "GOAT SEGUNDA / SEGUNDA MANO"
                : technology
                  ? "GOAT TIENDA / TECNOLOGÍA"
                  : "BIENVENIDO A GOAT"}
            </span>
            <h1>
              {management
                ? "Administra"
                : secondhand
                  ? "Otra vida."
                  : technology
                    ? "Conecta con"
                    : "Tu mundo"}
              <br />
              <em>
                {management
                  ? "tu catálogo."
                  : secondhand
                    ? "Más historias."
                    : technology
                      ? "lo que sigue."
                      : "digital."}
              </em>
            </h1>
            <p>
              {management
                ? "Gestiona stock, imágenes y accesos privados de todos tus productos."
                : secondhand
                  ? "Tecnología, ropa y calzado de segunda mano. Encuentra piezas con historia y dales una nueva oportunidad."
                  : technology
                    ? "Computadores, audio y accesorios para trabajar, jugar y crear. Encuentra tu próximo equipo en Goat Tienda."
                    : "Streaming, música y tus combos favoritos. Compra desde tu saldo Goat de forma fácil y rápida."}
            </p>
            <div className="hero-buttons">
              <button className="button dark" onClick={() => jump("Todos")}>
                Ver catálogo <ArrowRight size={17} />
              </button>
              <button
                className="button outline"
                onClick={() =>
                  jump(
                    secondhand
                      ? "Tecnología usada"
                      : technology
                        ? "Computadores"
                        : "Combos",
                  )
                }
              >
                {secondhand
                  ? "Explorar segunda mano"
                  : technology
                    ? "Explorar computadores"
                    : "Explorar combos"}
              </button>
            </div>
            <p>
              Hola, <strong>{user?.name}</strong> · Perfil:{" "}
              <strong>{user?.role.toLowerCase()}</strong>
            </p>
          </div>
          <div className="hero-visual">
            <div className="hero-orb orb-a" />
            <div className="hero-orb orb-b" />
            <div className="hero-center">
              <span>GOAT</span>
              <strong>
                {secondhand
                  ? "DALES UNA NUEVA VIDA"
                  : technology
                    ? "TU PRÓXIMA CONEXIÓN"
                    : "TODO TU ENTRETENIMIENTO"}
              </strong>
            </div>
            <div className="hero-feature one">
              {secondhand
                ? "⌘ Tecnología"
                : technology
                  ? "⌘ Computadores"
                  : "▶ Streaming"}
            </div>
            <div className="hero-feature two">
              {secondhand ? "✦ Ropa" : technology ? "♫ Audio" : "♫ Música"}
            </div>
            <div className="hero-feature three">
              {secondhand
                ? "↗ Calzado"
                : technology
                  ? "✦ Accesorios"
                  : "✦ Combos"}
            </div>
          </div>
        </section>
        )}
        {management && user?.role === "ADMIN" && <StoreOptionsEditor options={storeOptions} onChange={setStoreOptions} />}
        {management && user?.role === "ADMIN" && <CategoryImageManager />}
        {management && user?.role === "ADMIN" && <BannerEditor />}
        {!digitalCatalog && (
        <section className="container category-section" id="streaming">
          <div className="section-heading">
            <div>
              <span className="overline">EXPLORA GOAT</span>
              <h2>
                Elige una categoría <span>✳</span>
              </h2>
            </div>
          </div>
          <div
            className={`category-grid ${secondhand ? "secondhand-categories" : technology ? "tech-categories" : ""}`}
          >
            {orderedCategories.map((c, i) => (
              <div key={c} className="category-order-card" {...dragProps("categories", c)}>
              <button
                key={c}
                className={`category-tile ${["tile-stream", "tile-music", "tile-office", "tile-stream"][i % 4]}`}
                onClick={() => { if (!reorderMode) jump(c); }}
              >
                <CatalogImage
                  name={c}
                  category={c}
                  tile
                  className="category-photo"
                />
                <span className="category-photo-shade" aria-hidden="true" />
                <strong>{c}</strong>
                <small>Explorar productos</small>
                <ArrowRight className="tile-arrow" />
              </button>
              {orderControls("categories", c, c, orderedCategories)}
              </div>
            ))}
          </div>
        </section>
        )}
        <section className="container products-section" id="catalogo">
          <span id="combos" />
          <div className="section-heading">
            <div>
              <span className="overline">
                {secondhand
                  ? "CATÁLOGO DE SEGUNDA MANO"
                  : technology
                    ? "CATÁLOGO DE TECNOLOGÍA"
                    : "CATÁLOGO DIGITAL"}
              </span>
              <h2>
                {home ? "Streaming" : filter === "Todos"
                  ? secondhand
                    ? "Encuentra tu próxima historia"
                    : technology
                      ? "Tecnología para ti"
                      : "Todos los productos"
                  : filter}
                <span> ✳</span>
              </h2>
              <p>
                {
                  products.filter((p) => catalogCategories.includes(p.category) && (!home || p.category === "Streaming"))
                    .length
                }{" "}
                productos disponibles en Goat.
              </p>
            </div>
            {canManage && (
              <button className="button violet" onClick={() => startEdit()}>
                <Plus size={18} /> Agregar producto
              </button>
            )}
          </div>
          <div className="search-and-filters">
            <label className="catalog-search">
              <Search size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar productos..."
              />
            </label>
            {!home && <div className="filter-row">
              {["Todos", ...orderedCategories].map((c) => (
                <button
                  key={c}
                  className={`filter-pill ${filter === c ? "active" : ""}`}
                  onClick={() => setFilter(c)}
                >
                  {c}
                </button>
              ))}
            </div>}
          </div>
          <div className="catalog-results-heading">
            <p className="result-count">{visible.length} productos</p>
            {(home || (digitalCatalog && filter === "Streaming")) && query && <button type="button" className="button outline catalog-show-all" onClick={() => { setQuery(""); setFilter("Streaming"); }}>Ver todo Streaming</button>}
          </div>
          <div className="product-grid">
            {visible.map((p) => (
              <article key={p.id} className="product-card" {...dragProps("products", p.id)}>
                {orderControls("products", p.id, p.name, visible.map(product => product.id))}
                <div
                  className="product-photo"
                  style={{ background: p.gradient }}
                >
                  <div className="photo-click">
                    <CatalogImage
                      productId={p.id}
                      name={p.name}
                      category={p.category}
                    />
                  </div>
                  <span
                    className={
                      p.stock > 0 ? "stock-badge" : "stock-badge sold-out"
                    }
                  >
                    {p.stock > 0 ? p.stock + " disponibles" : "Agotado"}
                  </span>
                  <span className="tag">
                    {secondhand ? "Segunda mano" : p.category}
                  </span>
                </div>
                <div className="product-info">
                  <span className="category-label">{p.category}</span>
                  <strong className="product-title">{p.name}</strong>
                  <p className="product-description">{p.description}</p>
                  <div className="product-bottom">
                    <strong className="price">
                      {cop(p.price)} <small>COP</small>
                    </strong>
                    <button
                      className="add-mini"
                      title={p.stock > 0 ? "Agregar al carrito" : "Agotado"}
                      disabled={p.stock === 0}
                      onClick={() => add(p.id)}
                    >
                      <Plus />
                    </button>
                  </div>
                  {canManage &&
                    (user?.role === "ADMIN" || p.ownerId === user?.id) && (
                      <div className="manage-buttons">
                        <button onClick={() => startEdit(p)}>
                          <Pencil size={14} /> Editar
                        </button>
                        <button onClick={() => remove(p)}>
                          <Trash2 size={14} /> Agotar
                        </button>
                      </div>
                    )}
                </div>
              </article>
            ))}
          </div>
          {catalogLoading && <p role="status">Cargando catálogo…</p>}
          {!catalogLoading && visible.length === 0 && (
            <div className="empty">No hay productos para mostrar.</div>
          )}
        </section>
        {(home || (digitalCatalog && filter === "Streaming")) && <StreamingHighlights />}
        <section className="container contact" id="contacto">
          <div>
            <span className="overline">GOAT DIGITAL</span>
            <h2>¿Necesitas ayuda?</h2>
            <p>
              Contacta con la administración para consultar recargas, pedidos,
              modalidades de acceso y entrega.
            </p>
          </div>
          <a
            className="button violet"
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Escríbenos por WhatsApp
          </a>
        </section>
        {user?.role === "ADMIN" &&
          !technology &&
          !secondhand &&
          !management && <BannerEditor />}
        <section className="container account-section">
          <div className="section-heading">
            <div>
              <span className="overline">MI CUENTA</span>
              <h2>Pedidos y saldo</h2>
            </div>
          </div>
          <div className="account-grid">
            <div className="info-panel">
              <h3>Mi billetera</h3>
              <p className="wallet-amount">{cop(user?.balance || 0)}</p>
              <small>
                Solo el administrador puede aumentar el saldo. No se aceptan
                pagos automáticos.
              </small>
            </div>
            <div className="info-panel">
              <h3>Mis últimos pedidos</h3>
              {orders.length ? (
                orders.map((o) => (
                  <p key={o.id} className="order-entry">
                    #{o.id.slice(-8)} — {cop(o.total)} ·{" "}
                    {o.status.replaceAll("_", " ")}
                  </p>
                ))
              ) : (
                <p>Aún no tienes pedidos.</p>
              )}
            </div>
          </div>
        </section>
        {user?.role === "ADMIN" && (
          <section className="container admin-section">
            <span className="overline">ADMINISTRACIÓN EXCLUSIVA</span>
            <h2>Recargar saldo</h2>
            <p>
              Únicamente la cuenta administradora puede realizar recargas. Cada
              movimiento se guarda en el historial.
            </p>
            <form onSubmit={recharge} className="admin-form">
              <label>
                Cuenta de usuario
                <select
                  required
                  value={creditId}
                  onChange={(e) => setCreditId(e.target.value)}
                >
                  <option value="">Selecciona un usuario</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} · {u.email} · {cop(u.balance)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Valor COP
                <input
                  required
                  type="number"
                  min={1}
                  max={10000000}
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                />
              </label>
              <button className="button violet" disabled={busy || !creditId}>
                Recargar saldo
              </button>
            </form>
          </section>
        )}
      </main>
      <footer className="footer">
        <div className="container footer-bottom">
          © 2026 Goat · Tienda digital{" "}
          <span>
            La entrega de pedidos se gestiona manualmente. Confirma condiciones
            y derechos de comercialización.
          </span>
        </div>
      </footer>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {cartOpen && (
        <>
          <div className="overlay" onClick={() => setCartOpen(false)} />
          <aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Carrito"
          >
            <div className="drawer-head">
              <h2>Mi carrito ({count})</h2>
              <button onClick={() => setCartOpen(false)}>
                <X />
              </button>
            </div>
            <div className="drawer-list">
              {cart.length === 0 ? (
                <p>Tu carrito está vacío.</p>
              ) : (
                cart.map((i) => {
                  const p = products.find((p) => p.id === i.id);
                  return p ? (
                    <div key={i.id} className="cart-row">
                      <CatalogImage
                        productId={p.id}
                        name={p.name}
                        category={p.category}
                        className="cart-product-image"
                      />
                      <div className="cart-product-copy">
                        <strong>{p.name}</strong>
                        <p>
                          {cop(p.price)} × {i.qty}
                        </p>
                      </div>
                      <div className="qty-controls">
                        <button onClick={() => updateQty(i.id, -1)}>−</button>
                        {i.qty}
                        <button
                          disabled={i.qty >= Math.min(50, p.stock)}
                          onClick={() => updateQty(i.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : null;
                })
              )}
            </div>
            <div className="drawer-footer">
              <div className="subtotal">
                <b>Total</b>
                <strong>{cop(total)}</strong>
              </div>
              <p>Tu saldo: {cop(user?.balance || 0)}</p>
              <button
                className="button violet full"
                disabled={
                  busy ||
                  !cart.length ||
                  total > (user?.balance || 0) ||
                  cart.some(
                    (i) =>
                      !products.find((p) => p.id === i.id) ||
                      i.qty > (products.find((p) => p.id === i.id)?.stock || 0),
                  )
                }
                onClick={checkout}
              >
                Comprar con saldo Goat
              </button>
              {total > (user?.balance || 0) && (
                <small>
                  Saldo insuficiente: solicita una recarga al administrador.
                </small>
              )}
              {cart.some(
                (i) =>
                  i.qty > (products.find((p) => p.id === i.id)?.stock || 0),
              ) && (
                <p role="status">
                  Hay productos sin stock suficiente. Ajusta las cantidades.
                </p>
              )}
              <small>
                La compra debita tu saldo y crea un pedido con stock reservado.
                Los accesos digitales configurados se muestran en Pedidos.
              </small>
            </div>
          </aside>
        </>
      )}
      {editor && (
        <>
          <div className="overlay" onClick={() => setEditor(false)} />
          <div
            className="edit-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Editar producto"
          >
            <form onSubmit={save}>
              <div className="drawer-head">
                <h2>{editId ? "Editar producto" : "Agregar producto"}</h2>
                <button type="button" onClick={() => setEditor(false)}>
                  <X />
                </button>
              </div>
              <div className="edit-fields">
                <label>
                  Nombre
                  <input
                    required
                    minLength={2}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label>
                  Categoría
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    {allCategories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Precio (COP)
                  <input
                    type="number"
                    min={1}
                    required
                    value={form.price || ""}
                    onChange={(e) =>
                      setForm({ ...form, price: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Unidades disponibles
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    required
                    value={form.stock}
                    onChange={(e) =>
                      setForm({ ...form, stock: Number(e.target.value) })
                    }
                  />
                </label>
                {user?.role === "ADMIN" && editId && (
                  <>
                    <ImageUploadButton kind="product" imageKey={editId} />
                    {digitalCategories.some((c) => c === form.category) && (
                      <DeliveryEditor productId={editId} />
                    )}
                  </>
                )}
                <label>
                  Texto corto o marca
                  <input
                    maxLength={25}
                    value={form.mark}
                    onChange={(e) => setForm({ ...form, mark: e.target.value })}
                  />
                </label>
                <label>
                  Descripción
                  <textarea
                    maxLength={1000}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </label>
                <button disabled={busy} className="button violet full">
                  {busy ? "Guardando..." : "Guardar producto"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { supportLink } from "@/lib/account-links";
import { emptyCardOrders, sortCards, type CardOrders } from "@/lib/catalog-order";
import MarketplaceHome from "@/components/MarketplaceHome";
import ProductCarousel from "@/components/ProductCarousel";
import { homeProductRows } from "@/lib/home-product-rows";
import StreamingHighlights from "@/components/StreamingHighlights";
import { mergeCart, cartSignature } from "@/lib/cart";
import StoreOptionsEditor from "@/components/StoreOptionsEditor";
import type { StoreOptions } from "@/lib/store-settings";
import CategoryImageManager from "@/components/CategoryImageManager";
import StreamingInventoryEditor from "@/components/StreamingInventoryEditor";
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
  Copy,
  Sparkles,
  MapPin,
} from "lucide-react";
import {
  technologyCategories,
  digitalCategories,
  allCategories,
} from "@/lib/technology-products";
import { courseCategories } from "@/lib/course-products";
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
  configuredStock?: number;
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
  expectedConfiguredStock?: number;
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
  courses = false,
  technology = false,
  secondhand = false,
  management = false,
  digitalCatalog = false,
  initialCategory = "Todos",
  initialQuery = "",
}: {
  courses?: boolean;
  technology?: boolean;
  secondhand?: boolean;
  management?: boolean;
  digitalCatalog?: boolean;
  initialCategory?: string;
  initialQuery?: string;
}) {
  const home = !courses && !technology && !secondhand && !management && !digitalCatalog;
  const streamingLanding = digitalCatalog && initialCategory === "Streaming";
  const catalogCategories: readonly string[] = home || management
    ? allCategories
    : courses
      ? courseCategories
    : secondhand
      ? secondhandCategories
      : technology
        ? technologyCategories
        : digitalCategories;
  const router = useRouter();
  const [courseSeedBusy, setCourseSeedBusy] = useState(false);
  const [duplicateHint, setDuplicateHint] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const duplicateLock = useRef(false);
  const [buyNowId, setBuyNowId] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const checkoutLock = useRef(false);
  const checkoutIntent = useRef<{ userId: string; signature: string; key: string } | null>(null);

  const [cardOrders, setCardOrders] = useState<CardOrders>(emptyCardOrders);
  const [reorderMode, setReorderMode] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [dragged, setDragged] = useState<{kind: "products" | "categories"; id: string} | null>(null);
  const [user, setUser] = useState<User | null>(null),
    [products, setProducts] = useState<Product[]>([]),
    [catalogLoading, setCatalogLoading] = useState(true),
    [storeOptions, setStoreOptions] = useState<StoreOptions>({ tiendaEnabled: true, segundaEnabled: true }),
    [filter, setFilter] = useState(home ? "Todos" : initialCategory),
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
          mergeCart(data.filter(
            (i: CartItem) => i && typeof i.id === "string" && Number.isInteger(i.qty) && i.qty > 0,
          )),
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
          if ((!user || user.role === "CLIENTE") && ((technology && !data.storeOptions.tiendaEnabled) || (secondhand && !data.storeOptions.segundaEnabled))) router.replace("/");
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
          (filter === "Todos" || p.category === filter) &&
          (home ? [p.name, p.category, p.description].join(" ") : p.name)
            .toLocaleLowerCase("es")
            .includes(query.trim().toLocaleLowerCase("es")),
      ), cardOrders.products.ids, p => p.id),
    [products, cardOrders, filter, query, technology, secondhand, courses, management, home],
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
  const buyNowProduct = products.find(product => product.id === buyNowId);
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
    if (checkoutLock.current) { setNotice("Espera a que termine la compra actual."); return; }
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
    if (home && cat !== "Streaming" && cat !== "Todos") {
      router.push("/catalogo?categoria=" + encodeURIComponent(cat));
      return;
    }
    setFilter(cat);
    setMenu(false);
    document
      .getElementById("catalogo")
      ?.scrollIntoView({ behavior: "smooth" });
  };
  function authHref(productId?: string) {
    const path = courses ? "/cursos" : secondhand ? "/segunda" : technology ? "/store" : digitalCatalog ? "/catalogo" : "/";
    const params = new URLSearchParams();
    if (digitalCatalog) params.set("categoria", filter);
    if (productId) params.set("comprar", productId); else params.set("carrito", "1");
    return "/acceso?next=" + encodeURIComponent(path + "?" + params.toString());
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cliente")) setCreditId(params.get("cliente")!);
    if (params.get("comprar")) setBuyNowId(params.get("comprar"));
    else if (params.get("carrito") === "1") setCartOpen(true);
  }, []);
  async function logout() {
    await request("/api/auth/logout", "POST");
    setUser(null); setUsers([]); setOrders([]);
    await load();
    router.replace("/");
    router.refresh();
  }
  function startEdit(p?: Product) {
    setNotice("");
    setDuplicateHint("");
    setEditId(p?.id || null);
    setForm(
      p
        ? {
            name: p.name,
            category: p.category,
            price: p.price,
            stock: p.configuredStock ?? p.stock,
            expectedStock: p.stock,
            expectedConfiguredStock: p.configuredStock,
            description: p.description,
            mark: p.mark,
            active: true,
          }
        : {
            ...fresh(),
            category: courses
              ? "Cursos"
              : secondhand
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
  async function duplicate(p: Product) {
    if (duplicateLock.current) return;
    duplicateLock.current = true; setDuplicating(p.id);
    try {
      const data = await request(`/api/products/${p.id}/duplicate`, "POST", {});
      setProducts(old => [...old, data.product]);
      window.dispatchEvent(new Event("goat-catalog-images-updated"));
      startEdit(data.product);
      setDuplicateHint("Producto duplicado sin stock ni accesos privados. Edita la copia y añade su inventario.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo duplicar el producto."); }
    finally { duplicateLock.current = false; setDuplicating(null); }
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
        note: "Recarga manual desde panel Goats",
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
  useEffect(() => { setCheckoutError(""); }, [cart]);
  async function checkout(directItems?: CartItem[]) {
    const purchaseItems = directItems || cart;
    if (checkoutLock.current || !purchaseItems.length) return;
    if (!user) { router.push(authHref(directItems?.[0]?.id)); return; }
    const intentStorageKey = directItems ? "goat-buy-now-intent" : "goat-checkout-intent";
    checkoutLock.current = true;
    setCheckoutBusy(true); setCheckoutError("");
    try {
      const items = mergeCart(purchaseItems), signature = (directItems ? "direct:" : "") + cartSignature(items);
      if (!checkoutIntent.current || checkoutIntent.current.signature !== signature) {
        try { checkoutIntent.current = JSON.parse(sessionStorage.getItem(intentStorageKey) || "null"); } catch {}
      }
      if (checkoutIntent.current?.userId !== user.id || checkoutIntent.current?.signature !== signature || !/^[a-f0-9-]{36}$/i.test(checkoutIntent.current?.key || "")) {
        checkoutIntent.current = { userId: user.id, signature, key: crypto.randomUUID() };
      }
      try { sessionStorage.setItem(intentStorageKey, JSON.stringify(checkoutIntent.current)); } catch {}
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, checkoutKey: checkoutIntent.current.key }),
        signal: AbortSignal.timeout(45000),
      });
      const result = await response.json();
      if (response.status === 401) { setUser(null); router.push(authHref(directItems?.[0]?.id)); return; }
      if (!response.ok) throw Error(result.error || "No se pudo completar la compra.");
      checkoutIntent.current = null;
      try { sessionStorage.removeItem(intentStorageKey); } catch {}
      if (!directItems) setCart([]);
      setBuyNowId(null); setCartOpen(false);
      setNotice(`Pedido ${result.reference || result.orderId} guardado. Consulta el comprobante en Pedidos.`);
      router.push("/pedidos?pedido=" + encodeURIComponent(result.orderId) + "&comprobante=1");
    } catch (error) {
      const message = error instanceof DOMException && ["TimeoutError", "AbortError"].includes(error.name)
        ? "La respuesta está tardando. Revisa Mis pedidos o reintenta; recuperaremos el mismo pedido si ya se guardó."
        : error instanceof TypeError || error instanceof SyntaxError
          ? "No se recibió una respuesta válida. Revisa Mis pedidos o vuelve a intentarlo sin cambiar el carrito."
          : error instanceof Error ? error.message : "No se pudo completar la compra. Inténtalo de nuevo.";
      setCheckoutError(message);
    } finally { checkoutLock.current = false; setCheckoutBusy(false); }
  }

  function renderProduct(p: Product, rowIds: string[]) {
    return (
              <article key={p.id} className="product-card" {...dragProps("products", p.id)}>
                {orderControls("products", p.id, p.name, rowIds)}
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
                      disabled={p.stock === 0 || checkoutBusy}
                      aria-label={`Agregar ${p.name} al carrito`}
                      onClick={() => add(p.id)}
                    >
                      <Plus />
                    </button>
                  </div>
                  <button type="button" className="button violet buy-now-button" disabled={p.stock === 0 || checkoutBusy || catalogLoading} onClick={() => { setCheckoutError(""); setNotice(""); setBuyNowId(p.id); }}>
                    Comprar ahora
                  </button>
                  {canManage &&
                    (user?.role === "ADMIN" || p.ownerId === user?.id) && (
                      <div className="manage-buttons">
                        <button onClick={() => startEdit(p)}>
                          <Pencil size={14} /> Editar
                        </button>
                        <button type="button" disabled={duplicating !== null} onClick={() => void duplicate(p)}>
                          <Copy size={14} /> {duplicating === p.id ? "Duplicando…" : "Duplicar"}
                        </button>
                        <button onClick={() => remove(p)}>
                          <Trash2 size={14} /> Agotar
                        </button>
                      </div>
                    )}
                </div>
              </article>
    );
  }

  return (
    <div className={home ? "storefront marketplace-home" : "storefront"}>
      <div className="announcement">
        {courses
          ? "✦ GOATS CURSOS — Aprende y descubre nuevas habilidades"
          : secondhand
          ? "✦ GOATS SEGUNDA — Una nueva vida para tus favoritos"
          : technology
            ? "✦ GOATS TIENDA — Productos para tu día a día"
            : "✦ Bienvenido a GOATS — Streaming, música, productividad y combos"}
      </div>
      <header className="header">
        <div className="container nav">
          <a className="logo" href={technology || secondhand || courses || digitalCatalog || management ? "/" : "#inicio"}>
            Goats<span>.</span>
          </a>
          {home && <><form className="marketplace-search" role="search" onSubmit={event => { event.preventDefault(); document.getElementById("catalogo")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}>
            <label className="sr-only" htmlFor="marketplace-search-input">Buscar en todos los productos</label>
            <input id="marketplace-search-input" type="search" placeholder="Buscar productos, plataformas y mucho más…" value={query} onChange={event => setQuery(event.target.value)} />
            <button type="submit" aria-label="Buscar productos"><Search size={21}/></button>
          </form><span className="marketplace-location"><MapPin size={20}/><span>Compra en Colombia<strong>Precios en pesos COP</strong></span></span></>}
          <nav className={`navlinks ${menu ? "expanded" : ""}`}>
            <a
              href={technology || secondhand || courses || digitalCatalog || management ? "/#inicio" : "#inicio"}
              onClick={() => setMenu(false)}
            >
              Inicio
            </a>
            <Link
              href="/catalogo?categoria=Streaming"
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
            {!catalogLoading && (user && user.role !== "CLIENTE" || storeOptions.tiendaEnabled) && <a
              href="/store"
              aria-current={technology ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              Tienda
            </a>}
            {!catalogLoading && (user && user.role !== "CLIENTE" || storeOptions.segundaEnabled) && <a
              href="/segunda"
              aria-current={secondhand ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              Segunda
            </a>}
            <a href="/cursos" aria-current={courses ? "page" : undefined} onClick={() => setMenu(false)}>Cursos</a>
            <a href="#contacto" onClick={() => setMenu(false)}>
              Contacto
            </a>
          </nav>
          <div className="actions">
            {user && <><span className="balance-chip">
              <Wallet size={17} />
              {cop(user?.balance || 0)}
            </span>
            <ProfileMenu name={user.name} role={user.role} /></>}
            {!user && !catalogLoading && <Link className="guest-sign-in" href="/acceso">Ingresar / Registrarse</Link>}
            <button
              className="icon-button"
              title="Carrito"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={21} />
              {count > 0 && <span className="count">{count}</span>}
            </button>
            {user && <button
              className="icon-button"
              title="Cerrar sesión"
              onClick={logout}
            >
              <LogOut size={20} />
            </button>}
            <button
              className="icon-button mobile-toggle"
              aria-label={menu ? "Cerrar navegación" : "Abrir navegación"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="inicio">
        {home && <MarketplaceHome tienda={!catalogLoading && Boolean(user && user.role !== "CLIENTE" || storeOptions.tiendaEnabled)} segunda={!catalogLoading && Boolean(user && user.role !== "CLIENTE" || storeOptions.segundaEnabled)} signedIn={Boolean(user)} featured={homeProductRows(products, user?.role || "CLIENTE", storeOptions, cardOrders.products.ids).map(row => row.products[0]).filter((product): product is Product => Boolean(product))} />}
        {courses && <section className="container courses-hero">
          <div><span className="overline">GOATS ACADEMY / CURSOS</span><h1>Tu próxima habilidad<br /><em>empieza aquí.</em></h1><p>Descubre cursos de Office 365, Prime Video, YouTube, tarjetas temporales e ingresos extra. Consulta el temario y la modalidad de acceso de cada curso antes de comprar.</p><button className="button violet" onClick={() => jump("Todos")}>Explorar cursos <ArrowRight size={17} /></button></div>
          <div className="courses-hero-art" aria-hidden="true"><span>APRENDE</span><strong>CREA.<br />CRECE.</strong><small>Nuevas ideas. Nuevas posibilidades.</small></div>
        </section>}
        {courses && user?.role === "ADMIN" && !catalogLoading && <section className="container course-sample-panel"><p>Carga o actualiza los cinco cursos del catálogo. Las actualizaciones conservan precios, stock, imágenes y títulos personalizados.</p><button type="button" className="button violet" disabled={courseSeedBusy} onClick={async () => { setCourseSeedBusy(true); try { const result = await request("/api/admin/courses/seed", "POST", {}); await load(); setNotice(`${result.added} cursos añadidos y ${result.updated} actualizados.`); } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudieron cargar los cursos."); } finally { setCourseSeedBusy(false); } }}>{courseSeedBusy ? "Añadiendo cursos…" : "Cargar / actualizar cursos"}</button></section>}

        {user?.role === "ADMIN" && <div className="container card-order-toolbar">
          <button type="button" className="button violet" aria-pressed={reorderMode} disabled={orderBusy} onClick={() => setReorderMode(!reorderMode)}>{reorderMode ? "Terminar de ordenar" : "Ordenar tarjetas"}</button>
          {reorderMode && <p>Arrastra las tarjetas o usa las flechas para moverlas. Cada movimiento se guarda para todos.</p>}
        </div>}

        {!home && (!digitalCatalog || streamingLanding) && !courses && (
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
                ? "GOATS SEGUNDA / SEGUNDA MANO"
                : technology
                  ? "GOATS TIENDA / TECNOLOGÍA"
                  : "BIENVENIDO A GOATS"}
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
                    ? "Tecnología, vasos y camisetas para tu día a día. Encuentra tus favoritos en Goats Tienda."
                    : "Streaming, música y tus combos favoritos. Compra desde tu saldo Goats de forma fácil y rápida."}
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
            {user && <p>
              Hola, <strong>{user.name}</strong> · Perfil:{" "}
              <strong>{user.role.toLowerCase()}</strong>
            </p>}
          </div>
          <div className="hero-visual">
            <div className="hero-orb orb-a" />
            <div className="hero-orb orb-b" />
            <div className="hero-center">
              <span>GOATS</span>
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
        {management && user?.role === "ADMIN" && <div className="container admin-manager-link"><Link className="button violet" href="/administracion/ventas">Ventas y panel de administración</Link></div>}
        {management && user?.role === "ADMIN" && <div id="secciones"><StoreOptionsEditor options={storeOptions} onChange={setStoreOptions} /></div>}
        {management && user?.role === "ADMIN" && <div id="imagenes"><CategoryImageManager /></div>}
        {management && user?.role === "ADMIN" && <BannerEditor />}
        {!home && (!digitalCatalog || streamingLanding) && !courses && (
        <section className="container category-section" id="streaming">
          <div className="section-heading">
            <div>
              <span className="overline">EXPLORA GOATS</span>
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
        {digitalCatalog && (streamingLanding || filter === "Streaming") && <StreamingHighlights admin={user?.role === "ADMIN"} />}
        {home && <div id="catalogo" className="home-product-showcase">
          {query.trim() ? <section className="container marketplace-results" aria-labelledby="marketplace-results-title"><div className="marketplace-section-title"><div><h2 id="marketplace-results-title">Resultados para «{query}»</h2><p role="status">{visible.length} productos encontrados</p></div><button type="button" className="button outline" onClick={() => setQuery("")}>Limpiar búsqueda</button></div><div className="product-grid">{visible.map(product => renderProduct(product, visible.map(item => item.id)))}</div>{!catalogLoading && visible.length === 0 && <p className="empty">No encontramos productos. Prueba con otra palabra.</p>}</section> : homeProductRows(products, user?.role || "CLIENTE", catalogLoading ? { tiendaEnabled: false, segundaEnabled: false } : storeOptions, cardOrders.products.ids).map(row => <ProductCarousel key={row.id} id={row.id} title={row.title} href={row.href} count={row.products.length} loading={catalogLoading}>
            {row.products.map(product => renderProduct(product, row.products.map(item => item.id)))}
          </ProductCarousel>)}
        </div>}
        {!home && <section className="container products-section" id="catalogo">
          <span id="combos" />
          <div className="section-heading">
            <div>
              <span className="overline">
                {courses ? "CURSOS Y APRENDIZAJE" : home
                  ? (filter === "Streaming" ? "PLATAFORMAS DE STREAMING" : "CATÁLOGO DIGITAL")
                  : secondhand
                  ? "CATÁLOGO DE SEGUNDA MANO"
                  : technology
                    ? "CATÁLOGO DE TECNOLOGÍA"
                    : "CATÁLOGO DIGITAL"}
              </span>
              <h2>
                {courses ? "Explora nuestros cursos" : home ? (filter === "Todos" ? "Todos los productos digitales" : filter) : filter === "Todos"
                  ? secondhand
                    ? "Encuentra tu próxima historia"
                    : technology
                      ? "Tienda para ti"
                      : "Todos los productos"
                  : filter}
                <span> ✳</span>
              </h2>
              <p>
                {
                  products.filter((p) => catalogCategories.includes(p.category))
                    .length
                }{" "}
                {courses ? "cursos en Goats." : "productos disponibles en Goats."}
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
            {<div className="filter-row">
              {["Todos", ...orderedCategories].map((c) => (
                <button
                  key={c}
                  className={`filter-pill ${filter === c ? "active" : ""}`}
                  onClick={() => { setFilter(c); setQuery(""); }}
                >
                  {c}
                </button>
              ))}
            </div>}
          </div>
          <div className="catalog-results-heading">
            <p className="result-count">{visible.length} productos</p>
            {home && query && <button type="button" className="button outline catalog-show-all" onClick={() => setQuery("")}>Limpiar búsqueda</button>}
            {!home && digitalCatalog && filter === "Streaming" && query && <button type="button" className="button outline catalog-show-all" onClick={() => { setQuery(""); setFilter("Streaming"); }}>Ver todo Streaming</button>}
          </div>
          <div className="product-grid">
            {visible.map(p => renderProduct(p, visible.map(product => product.id)))}
          </div>
          {catalogLoading && <p role="status">Cargando catálogo…</p>}
          {!catalogLoading && visible.length === 0 && (
            <div className="empty">No hay productos para mostrar.</div>
          )}
        </section>}
        <section className="container contact" id="contacto">
          <div>
            <span className="overline">GOATS DIGITAL</span>
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
        {user && <section className="container account-section">
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
        </section>}
        {user?.role === "ADMIN" && (
          <section className="container admin-section" id="recargas">
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
          © 2026 Goats · Tienda digital{" "}
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
                        <button disabled={checkoutBusy} onClick={() => updateQty(i.id, -1)}>−</button>
                        {i.qty}
                        <button
                          disabled={checkoutBusy || i.qty >= Math.min(50, p.stock)}
                          onClick={() => updateQty(i.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : <div key={i.id} className="cart-row"><div className="cart-product-copy"><strong>Producto no disponible</strong><p>Quita este producto para continuar con los demás.</p></div><button type="button" disabled={checkoutBusy} onClick={() => setCart(old => old.filter(item => item.id !== i.id))}>Quitar</button></div>;
                })
              )}
            </div>
            <div className="drawer-footer">
              <div className="subtotal">
                <b>Total</b>
                <strong>{cop(total)}</strong>
              </div>
              {user && <p>Tu saldo: {cop(user.balance)}</p>}
              {user ? <button
                className="button violet full"
                disabled={checkoutBusy || !cart.length || !user || catalogLoading}
                onClick={() => void checkout()}
              >
                {checkoutBusy ? "Procesando y guardando tu pedido…" : "Comprar con saldo Goats"}
              </button> : <><p>Crea una cuenta o inicia sesión para comprar. Conservaremos tu carrito.</p><Link className="button violet full" href={authHref()}>Iniciar sesión o crear cuenta</Link></>}
              {checkoutBusy && <p role="status">Estamos comprobando todos los productos y guardando tu compra. Espera un momento.</p>}
              {checkoutError && <div className="checkout-error" role="alert"><p>{checkoutError}</p><a href="/pedidos">Revisar Mis pedidos</a></div>}
              {user && total > user.balance && (
                <small>
                  El saldo mostrado no cubre este total. Al comprar comprobaremos tu saldo actualizado.
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
      {buyNowId && (
        <>
          <div className="overlay" onClick={() => { if (!checkoutBusy) setBuyNowId(null); }} />
          <section className="buy-now-dialog" role="dialog" aria-modal="true" aria-labelledby="buy-now-title">
            <h2 id="buy-now-title">Comprar ahora</h2>
            {buyNowProduct ? <>
              <strong>{buyNowProduct.name}</strong>
              <p>1 unidad · {cop(buyNowProduct.price)} COP</p>
              {user && <p>Saldo Goats: {cop(user.balance)}</p>}
              <p>{user ? "Confirmar descontará el total de tu saldo y guardará el pedido. Tu carrito se conserva." : "Crea una cuenta o inicia sesión para comprar. Tu carrito se conserva."}</p>
              {buyNowProduct.stock === 0 && <p role="status">Producto agotado.</p>}
              {user ? <button type="button" className="button violet full" autoFocus disabled={checkoutBusy || buyNowProduct.stock === 0 || !user} onClick={() => void checkout([{ id: buyNowProduct.id, qty: 1 }])}>
                {checkoutBusy ? "Procesando compra…" : "Confirmar compra"}
              </button> : <Link className="button violet full" href={authHref(buyNowProduct.id)}>Iniciar sesión o crear cuenta</Link>}
            </> : <p>Este producto ya no está disponible.</p>}
            {checkoutError && <div className="checkout-error" role="alert"><p>{checkoutError}</p><a href="/pedidos">Revisar Mis pedidos</a></div>}
            <button type="button" className="button pale full" disabled={checkoutBusy} onClick={() => setBuyNowId(null)}>Cancelar</button>
          </section>
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
                {duplicateHint && <p className="duplicate-info" role="status">{duplicateHint}</p>}
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
                  {form.category === "Combos" ? "Cantidad de combos para vender (ejemplo: 10)" : form.category === "Streaming" ? "Disponibles (según accesos individuales)" : "Unidades disponibles"}
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    required
                    value={form.stock}
                    disabled={form.category === "Streaming"}
                    onChange={(e) =>
                      setForm({ ...form, stock: Number(e.target.value) })
                    }
                  />
                </label>
                {user?.role === "ADMIN" && editId && (
                  <>
                    <ImageUploadButton kind="product" imageKey={editId} />
                    {digitalCategories.some((c) => c === form.category) && (
                      form.category === "Combos" ? <p>Puedes añadir 10 combos sin introducir cuentas. Cada venta descuenta un combo y un perfil por plataforma desde el inventario de Streaming. La disponibilidad también depende del stock de sus plataformas. Usa nombres como «Combo x2: Netflix + Prime Video». Netflix utiliza únicamente x28 días; se excluyen las cuentas completas. No añadas credenciales compartidas al combo.</p> : form.category === "Streaming" ? <StreamingInventoryEditor productId={editId} onStockChange={stock => { setForm(old => ({ ...old, stock, expectedStock: stock })); setProducts(old => old.map(p => p.id === editId ? { ...p, stock } : p)); }} /> : <DeliveryEditor productId={editId} />
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
    </div>
  );
}

"use client";
import { useState } from "react";

type Product = { id: string; name: string; category: string; stock: number };
export default function AdminProductList<T extends Product>({ products, loading, onEdit, onDelete, deletingId }: {
  products: T[];
  loading: boolean;
  onEdit: (product: T) => void;
  onDelete: (product: T) => void;
  deletingId: string | null;
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLocaleLowerCase("es");
  // The catalogue is returned oldest first. Reverse a copy, preserving storefront order.
  const matches = [...products].reverse().filter(product =>
    [product.name, product.category, product.id].some(value => value.toLocaleLowerCase("es").includes(term)),
  );
  return <section className="container admin-product-list" id="productos-admin" aria-labelledby="admin-products-title">
    <h2 id="admin-products-title">Productos e inventario</h2>
    <p>Abre cualquier producto, incluidas las copias y los agotados. Los más recientes aparecen primero.</p>
    <label>Buscar producto para administrar<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, categoría o ID" /></label>
    <p role="status">{loading ? "Cargando productos…" : `${matches.length} productos`}</p>
    <div className="admin-product-list-scroll" aria-label="Productos para administrar" tabIndex={0}>
      {matches.map(product => <div className="admin-product-list-row" key={product.id}>
        <div><strong>{product.name}</strong><small>{product.category} · {product.stock > 0 ? `${product.stock} disponibles` : "Agotado"}</small><small>ID: {product.id}</small></div>
        <div className="admin-product-row-actions"><button type="button" className="button violet" onClick={() => onEdit(product)} aria-label={`Editar ${product.name}`}>Editar e inventario</button><button type="button" className="button danger" disabled={deletingId !== null} onClick={() => onDelete(product)} aria-label={`Eliminar ${product.name}`}>{deletingId === product.id ? "Eliminando…" : "Eliminar"}</button></div>
      </div>)}
      {!loading && !matches.length && <p>No se encontraron productos.</p>}
    </div>
  </section>;
}

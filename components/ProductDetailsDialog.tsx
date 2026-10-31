"use client";
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import CatalogImage from './CatalogImage';
type Product = { id: string; name: string; category: string; description: string; price: number; stock: number };
export default function ProductDetailsDialog({ product, busy, onClose, onAdd, onBuy }: { product: Product; busy: boolean; onClose: () => void; onAdd: () => void; onBuy: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current; element?.showModal();
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = previous; };
  }, []);
  const price = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(product.price);
  return <dialog ref={dialog} className="product-details-dialog" aria-labelledby="product-details-title" onCancel={onClose} onClose={() => { if (!dialog.current?.open) onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="product-details-content"><div className="product-details-heading"><span>{product.category}</span><button type="button" className="icon-button" aria-label="Cerrar detalles del producto" autoFocus onClick={onClose}><X/></button></div>
      <div className="product-details-grid"><div className="product-details-image"><CatalogImage productId={product.id} name={product.name} category={product.category}/></div><div className="product-details-copy"><h2 id="product-details-title">{product.name}</h2><span className={product.stock > 0 ? 'product-details-stock' : 'product-details-stock sold-out'}>{product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}</span><p className="product-details-price">${price} <small>COP</small></p><h3>Descripción</h3><p className="product-details-description">{product.description || 'Consulta con soporte para obtener más información de este producto.'}</p><div className="product-details-actions"><button type="button" className="button violet" disabled={busy || product.stock === 0} onClick={onBuy}>Comprar ahora</button><button type="button" className="button pale" disabled={busy || product.stock === 0} onClick={onAdd}>Agregar al carrito</button></div></div></div>
    </div>
  </dialog>;
}

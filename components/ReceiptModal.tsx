"use client";
import { useEffect, useRef } from "react";
import PurchaseReceipt from "./PurchaseReceipt";

export default function ReceiptModal({ reference, date, total, items }: {
  reference: string; date: string; total: string;
  items: { id: string; name: string; quantity: number; amount: string; receipt: string | null }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restore = () => { document.body.style.overflow = previous; };
    element?.addEventListener("close", restore);
    return () => { restore(); element?.removeEventListener("close", restore); element?.close(); };
  }, []);
  return <dialog ref={dialog} className="receipt-modal" aria-labelledby="receipt-title">
    <header><h2 id="receipt-title">Compra realizada · {reference}</h2>
      <button type="button" className="button outline" autoFocus onClick={() => dialog.current?.close()}>Cerrar</button></header>
    <p>{date} · Total: <strong>{total}</strong></p>
    {items.map(item => <section key={item.id}>
      <h3>{item.name}</h3><p>{item.quantity} unidades · {item.amount}</p>
      {item.receipt ? <PurchaseReceipt text={item.receipt} /> : <p>Entrega pendiente. Consulta el estado en Pedidos.</p>}
    </section>)}
    <p>Tu comprobante queda guardado en Mis pedidos.</p>
  </dialog>;
}

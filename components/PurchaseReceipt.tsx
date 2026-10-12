"use client";
import { useState } from "react";
export default function PurchaseReceipt({ text }: { text: string }) {
  const [message, setMessage] = useState("");
  return (
    <section className="purchase-receipt">
      <h4>Comprobante y acceso de streaming</h4>
      <pre>{text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, index) =>
        /^\*\*[^*\n]+\*\*$/.test(part) ? <strong key={index}>{part.slice(2, -2)}</strong> :
        /^\*[^*\n]+\*$/.test(part) ? <strong key={index}>{part.slice(1, -1)}</strong> : part
      )}</pre>
      <button
        type="button"
        className="button outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setMessage("Comprobante copiado.");
          } catch {
            setMessage("Selecciona el texto para copiarlo.");
          }
        }}
      >
        Copiar comprobante
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

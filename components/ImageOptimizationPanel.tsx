"use client";
import { useState } from 'react';
const size = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
export default function ImageOptimizationPanel() {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function run() {
    setBusy(true);
    let before = 0, after = 0, changed = 0, failed = 0;
    try {
      const response = await fetch('/api/admin/images/optimize');
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'No se pudo cargar la lista.');
      const images: { type: string; id: string }[] = result.images;
      for (const [index, image] of images.entries()) {
        setMessage(`Optimizando ${index + 1} de ${images.length}… Mantén esta pestaña abierta.`);
        try {
          const response = await fetch('/api/admin/images/optimize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(image) });
          const item = await response.json();
          if (!response.ok) { if ([401, 403].includes(response.status)) throw Error('La sesión terminó.'); failed++; continue; }
          before += item.before; after += item.after; if (item.changed) changed++;
        } catch { failed++; }
      }
      setMessage(`${changed} imágenes optimizadas. ${size(before)} → ${size(after)}. Ahorro: ${size(before - after)}.${failed ? ` ${failed} imágenes no pudieron procesarse; puedes volver a intentarlo.` : ''}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo completar la optimización.'); }
    finally {
      window.dispatchEvent(new Event('goat-catalog-images-updated'));
      window.dispatchEvent(new Event('goat-banners-updated'));
      setBusy(false);
    }
  }
  return <section className="container course-sample-panel"><div><h2>Optimizar imágenes</h2><p>Las nuevas imágenes se comprimen automáticamente. Optimiza las que ya subiste para reducir su peso; se conservan las versiones que ya pesan menos. Se aplica compresión con pérdida y se conservan las animaciones.</p><button type="button" className="button violet" disabled={busy} onClick={() => void run()}>{busy ? 'Optimizando…' : 'Comprimir imágenes existentes'}</button>{message && <p role="status">{message}</p>}</div></section>;
}

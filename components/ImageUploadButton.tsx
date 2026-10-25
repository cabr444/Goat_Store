"use client";
import { compressUpload } from "@/lib/compress-upload";
import { useState } from "react";
import { Upload } from "lucide-react";
export default function ImageUploadButton({
  kind,
  imageKey,
}: {
  kind: "category" | "product" | "series" | "platform";
  imageKey: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const url =
    "/api/admin/images?kind=" + kind + "&key=" + encodeURIComponent(imageKey);
  async function change(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Máximo 2 MB por imagen.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const upload = await compressUpload(file, kind);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": upload.type },
        body: upload,
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      window.dispatchEvent(new Event("goat-catalog-images-updated"));
      setMessage("Imagen actualizada.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No se pudo guardar la imagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    setBusy(true);
    try {
      const response = await fetch(url, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      window.dispatchEvent(new Event("goat-catalog-images-updated"));
      setMessage("Imagen de ejemplo restaurada.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No se pudo restaurar la imagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="catalog-image-editor">
      <label>
        <Upload size={16} />
        {busy ? "Guardando…" : "Cambiar imagen"}
        <input
          type="file"
          aria-label={"Cambiar imagen " + imageKey}
          accept="image/jpeg,image/png,image/webp,image/avif,.avif"
          disabled={busy}
          onChange={(e) => {
            void change(e.currentTarget.files?.[0]);
            e.currentTarget.value = "";
          }}
        />
      </label>
      <button type="button" disabled={busy} onClick={() => void restore()}>
        Restaurar imagen
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

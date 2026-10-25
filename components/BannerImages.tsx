"use client";
import { useEffect, useState } from "react";
import { Pause, Play, Upload } from "lucide-react";
import {
  bannerSlots,
  bannerInterval,
  defaultBannerImage,
  maxBannerBytes,
} from "@/lib/banner-images";
type ImageEntry = { slot: number; updatedAt: string };
function useBannerSources() {
  const [sources, setSources] = useState<string[]>(
    bannerSlots.map(defaultBannerImage),
  );
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/banners", { cache: "no-store" });
        if (!response.ok) return;
        const { images } = (await response.json()) as { images: ImageEntry[] };
        if (alive)
          setSources(
            bannerSlots.map((slot) => {
              const image = images.find((i) => i.slot === slot);
              return image
                ? "/api/banners/" +
                    slot +
                    "?v=" +
                    encodeURIComponent(image.updatedAt)
                : defaultBannerImage(slot);
            }),
          );
      } catch {}
    };
    void load();
    window.addEventListener("goat-banners-updated", load);
    return () => {
      alive = false;
      window.removeEventListener("goat-banners-updated", load);
    };
  }, []);
  return sources;
}
export function BannerBackground() {
  const sources = useBannerSources();
  const [loaded, setLoaded] = useState<number[]>([0]);
  const [active, setActive] = useState(0),
    [paused, setPaused] = useState(false),
    [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % bannerSlots.length),
      bannerInterval,
    );
    return () => window.clearInterval(timer);
  }, [paused, reduced]);
  useEffect(() => {
    // Prepare one following slide after the current image has had priority.
    const timer = window.setTimeout(() => {
      const next = (active + 1) % bannerSlots.length;
      setLoaded(old => old.includes(next) ? old : [...old, next]);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [active]);
  return (
    <>
      <div className="banner-background" aria-hidden="true">
        {sources.map((src, i) => (loaded.includes(i) || active === i) && (
          <img
            key={i}
            src={src}
            alt=""
            decoding="async"
            fetchPriority={i === 0 ? "high" : "low"}
            className={"banner-slide " + (i === active ? "active" : "")}
            onError={(e) => {
              const fallback = defaultBannerImage(i + 1);
              if (!e.currentTarget.src.endsWith(fallback))
                e.currentTarget.src = fallback;
            }}
          />
        ))}
        <div className="banner-scrim" />
      </div>
      <div className="banner-controls" aria-label="Imágenes del banner">
        {bannerSlots.map((slot, i) => (
          <button
            key={slot}
            type="button"
            aria-label={"Ver imagen " + slot}
            aria-pressed={active === i}
            className={active === i ? "active" : ""}
            onClick={() => {
              setLoaded(old => old.includes(i) ? old : [...old, i]);
              setActive(i);
            }}
          />
        ))}
        <button
          type="button"
          className="banner-pause"
          aria-label={
            paused || reduced ? "Reanudar imágenes" : "Pausar imágenes"
          }
          onClick={() => {
            setPaused(!(paused || reduced));
            setReduced(false);
          }}
        >
          {paused || reduced ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>
    </>
  );
}
export function BannerEditor() {
  const sources = useBannerSources();
  const [busy, setBusy] = useState<number | null>(null),
    [message, setMessage] = useState("");
  async function save(slot: number, file: File) {
    if (file.size > maxBannerBytes) {
      setMessage("La imagen debe pesar máximo 2 MB.");
      return;
    }
    setBusy(slot);
    setMessage("");
    try {
      const response = await fetch("/api/banners/" + slot, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      window.dispatchEvent(new Event("goat-banners-updated"));
      setMessage("Imagen " + slot + " actualizada.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No se pudo guardar la imagen.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function restore(slot: number) {
    setBusy(slot);
    setMessage("");
    try {
      const response = await fetch("/api/banners/" + slot, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      window.dispatchEvent(new Event("goat-banners-updated"));
      setMessage("Imagen " + slot + " restaurada.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "No se pudo restaurar la imagen.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="container banner-editor">
      <span className="overline">ADMINISTRACIÓN</span>
      <h2>Imágenes del banner de Inicio</h2>
      <p>
        Selecciona tus seis imágenes. El fondo cambia cada 7 segundos. JPG, PNG,
        WebP o AVIF, máximo 2 MB por imagen. Recomendado: 1600 × 700 px.
      </p>
      <div className="banner-upload-grid">
        {bannerSlots.map((slot, i) => (
          <div className="banner-upload-card" key={slot}>
            <img src={sources[i]} alt={"Imagen " + slot + " del banner"} />
            <label>
              <Upload size={16} />
              {busy === slot ? "Guardando…" : "Cambiar imagen " + slot}
              <input
                type="file"
                aria-label={"Cambiar imagen " + slot}
                accept="image/jpeg,image/png,image/webp,image/avif,.avif"
                disabled={busy !== null}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) void save(slot, file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void restore(slot)}
            >
              Restaurar imagen
            </button>
          </div>
        ))}
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

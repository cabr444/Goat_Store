"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
const Context = createContext<Record<string, string>>({});
export const useCatalogOverrides = () => useContext(Context);
export default function CatalogImageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const lastLoad = useRef(0);
  const [images, setImages] = useState<Record<string, string>>({});
  useEffect(() => {
    if (pathname === "/acceso" || pathname === "/restablecer-contrasena" || pathname === "/reset-password") {
      lastLoad.current = 0;
      setImages({});
      return;
    }
    let alive = true;
    const load = async (force = false) => {
      if (!force && Date.now() - lastLoad.current < 30000) return;
      try {
        const response = await fetch("/api/catalog-images", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const result = (await response.json()) as {
          images: { key: string; updatedAt: string }[];
        };
        if (alive) {
          lastLoad.current = Date.now();
          setImages(
            Object.fromEntries(
              result.images.map((image) => [
                image.key,
                "/api/catalog-images/file?key=" +
                  encodeURIComponent(image.key) +
                  "&v=" +
                  encodeURIComponent(image.updatedAt),
              ]),
            ),
          );
        }
      } catch {}
    };
    void load();
    const refresh = () => void load(true);
    window.addEventListener("goat-catalog-images-updated", refresh);
    return () => {
      alive = false;
      window.removeEventListener("goat-catalog-images-updated", refresh);
    };
  }, [pathname]);
  return <Context.Provider value={images}>{children}</Context.Provider>;
}

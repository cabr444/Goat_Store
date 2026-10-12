"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
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
  const [images, setImages] = useState<Record<string, string>>({});
  useEffect(() => {
    if (pathname === "/acceso" || pathname === "/restablecer-contrasena" || pathname === "/reset-password") {
      setImages({});
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/catalog-images", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const result = (await response.json()) as {
          images: { key: string; updatedAt: string }[];
        };
        if (alive)
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
      } catch {}
    };
    void load();
    window.addEventListener("goat-catalog-images-updated", load);
    return () => {
      alive = false;
      window.removeEventListener("goat-catalog-images-updated", load);
    };
  }, [pathname]);
  return <Context.Provider value={images}>{children}</Context.Provider>;
}

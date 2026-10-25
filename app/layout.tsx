import CatalogImageProvider from "@/components/CatalogImageProvider";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Goats | Streaming, música y productos digitales",
  description:
    "Explora el catálogo Goats: streaming, música y productividad, con precios en pesos colombianos.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CO">
      <body>
        <CatalogImageProvider>{children}</CatalogImageProvider>
      </body>
    </html>
  );
}

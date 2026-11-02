import { RechargeNotificationProvider } from "@/components/RechargeNotifications";
import ThemeToggle from "@/components/ThemeToggle";
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
    <html lang="es-CO" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `(function(){var t;try{t=localStorage.getItem('goats-theme')}catch(e){}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()` }}/></head>
      <body>
        <RechargeNotificationProvider><CatalogImageProvider>{children}</CatalogImageProvider></RechargeNotificationProvider>
        <ThemeToggle/>
      </body>
    </html>
  );
}

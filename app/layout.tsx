import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Goat | Streaming, música y productos digitales",description:"Explora el catálogo Goat: streaming, música y productividad, con precios en pesos colombianos."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es-CO"><body>{children}</body></html>}

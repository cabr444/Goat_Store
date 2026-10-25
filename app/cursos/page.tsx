export const dynamic = "force-dynamic";
import Storefront from "@/components/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Cursos | Goats", description: "Explora cursos de Windows, Office 365, plataformas digitales e ingresos extra en Goats." };
export default async function Page() {
  return <Storefront courses />;
}

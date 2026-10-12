import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { digitalCategories } from "@/lib/technology-products";
import Storefront from "@/components/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Catálogo digital | Goat" };
export default async function Page({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  if (!await getUser()) redirect("/acceso");
  const { categoria } = await searchParams;
  const initialCategory = digitalCategories.some(category => category === categoria) ? categoria! : "Todos";
  return <Storefront key={initialCategory} digitalCatalog initialCategory={initialCategory} />;
}

export const dynamic = "force-dynamic";
import { streamingHighlights } from "@/lib/streaming-highlights";
import { digitalCategories } from "@/lib/technology-products";
import Storefront from "@/components/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Catálogo digital | Goat" };
export default async function Page({ searchParams }: { searchParams: Promise<{ categoria?: string; plataforma?: string }> }) {
  const { categoria, plataforma } = await searchParams;
  const initialCategory = digitalCategories.some(category => category === categoria) ? categoria! : "Todos";
  const initialQuery = initialCategory === "Streaming" ? streamingHighlights.find(item => item.id === plataforma)?.query || "" : "";
  return <Storefront key={initialCategory + initialQuery} digitalCatalog initialCategory={initialCategory} initialQuery={initialQuery} />;
}

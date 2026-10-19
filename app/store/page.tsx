export const dynamic = "force-dynamic";
import { getStoreOptions } from "@/lib/store-settings";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Storefront from "@/components/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Tienda · Tecnología | Goat" };
export default async function Page() {
  const user = await getUser();
  if ((!user || user.role === "CLIENTE") && !(await getStoreOptions()).tiendaEnabled) redirect("/");
  return <Storefront technology />;
}

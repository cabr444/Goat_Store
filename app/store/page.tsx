import { getStoreOptions } from "@/lib/store-settings";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Storefront from "@/components/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Tienda · Tecnología | Goat" };
export default async function Page() {
  const user = await getUser();
  if (!user) redirect("/acceso");
  if (user.role === "CLIENTE" && !(await getStoreOptions()).tiendaEnabled) redirect("/");
  return <Storefront technology />;
}

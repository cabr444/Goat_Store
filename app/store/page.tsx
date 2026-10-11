import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Storefront from "@/components/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Tienda · Tecnología | Goat" };
export default async function Page() {
  if (!(await getUser())) redirect("/acceso");
  return <Storefront technology />;
}

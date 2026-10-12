import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Storefront from "@/components/Storefront";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Administrar catálogo | Goat",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await getUser();
  if (!user) redirect("/acceso");
  if (user.role !== "ADMIN") redirect("/perfil");
  return <Storefront management />;
}

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Access from "@/components/Access";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ recuperar?: string }>;
}) {
  const { recuperar } = await searchParams;
  if (await getUser()) redirect("/");
  return <Access recover={recuperar === "1"} />;
}

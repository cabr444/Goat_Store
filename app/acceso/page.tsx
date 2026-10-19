import { safeStoreReturn } from "@/lib/auth-return";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Access from "@/components/Access";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ recuperar?: string; next?: string }>;
}) {
  const { recuperar, next } = await searchParams;
  if (await getUser()) redirect(safeStoreReturn(next));
  return <Access recover={recuperar === "1"} returnTo={safeStoreReturn(next)} />;
}

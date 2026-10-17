import EmailConfirmation from "@/components/EmailConfirmation";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Confirma tu correo | Goat", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <EmailConfirmation token={token && /^[a-f0-9]{64}$/.test(token) ? token : ""} />;
}

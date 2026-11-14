export const dynamic = "force-dynamic";
import Storefront from "@/components/Storefront";
import { homepageDestination } from "@/lib/homepage";
import { getStoreOptions } from "@/lib/store-settings";
import { redirect } from "next/navigation";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  if (homepageDestination(await getStoreOptions()) !== "/") {
    const query = new URLSearchParams();
    for (const [key,value] of Object.entries(await searchParams)) {
      if (typeof value === 'string') query.set(key,value);
      else if (Array.isArray(value)) value.forEach(part=>query.append(key,part));
    }
    query.set('categoria','Streaming');
    redirect('/catalogo?' + query.toString());
  }
  return <Storefront />;
}

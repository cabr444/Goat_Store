import {redirect} from "next/navigation";import {getUser} from "@/lib/auth";import Storefront from "@/components/Storefront";
export default async function Page(){if(!await getUser())redirect("/acceso");return <Storefront/>}

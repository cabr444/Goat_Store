import {redirect} from "next/navigation";import {getUser} from "@/lib/auth";import Storefront from "@/components/Storefront";
import AnimeWelcome from "@/components/AnimeWelcome";
export default async function Page(){if(!await getUser())redirect("/acceso");return <><AnimeWelcome/><Storefront/></>}

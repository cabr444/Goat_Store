import {redirect} from "next/navigation";import {getUser} from "@/lib/auth";import Access from "@/components/Access";
export default async function Page(){if(await getUser())redirect("/");return <Access/>}

import {getUser} from "@/lib/auth";import {db} from "@/lib/db";import {reply,fail} from "@/lib/http";
export async function GET(){const u=await getUser();if(!u||u.role!=="ADMIN")return fail("No autorizado.",403);return reply({users:await db.user.findMany({select:{id:true,name:true,email:true,role:true,balance:true},orderBy:{createdAt:"desc"}})})}

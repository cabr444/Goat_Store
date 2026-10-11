import {NextResponse} from "next/server";
export const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export const fail=(message:string,status=400)=>reply({error:message},status);

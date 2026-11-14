import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { reply, fail } from '@/lib/http';
import { secureMutation, consumeLimit } from '@/lib/security';
import { encryptPrivate, decryptPrivate } from '@/lib/private-delivery';
import { pushConfigured, sendPush } from '@/lib/admin-push';
import { pushSubscriptionSchema, allowedPushEndpoint } from '@/lib/push-schema';
export const dynamic = 'force-dynamic';
const hash = (endpoint:string)=>createHash('sha256').update(endpoint).digest('hex');
export async function GET() {
  if((await getUser())?.role !== 'ADMIN') return fail('Solo administración.',403);
  return reply({configured:pushConfigured(),publicKey:pushConfigured()?process.env.VAPID_PUBLIC_KEY:null});
}
export const POST = secureMutation(async(req:Request)=>{
  const user=await getUser(); if(user?.role !== 'ADMIN') return fail('Solo administración.',403);
  if(!pushConfigured()) return fail('Configura las claves VAPID en el servidor.',503);
  if(!await consumeLimit(`admin-push:${user.id}`,30)) return fail('Espera unos minutos antes de intentarlo de nuevo.',429);
  const body=await req.json();
  const subscription=pushSubscriptionSchema.safeParse(body.subscription);
  if(!subscription.success) return fail('Suscripción inválida.',400);
  const endpointHash=hash(subscription.data.endpoint);
  if(body.test === true) {
    const saved=await db.adminPushSubscription.findFirst({where:{endpointHash,userId:user.id}});
    if(!saved) return fail('Activa las notificaciones primero.',404);
    try {await sendPush(pushSubscriptionSchema.parse(JSON.parse(decryptPrivate(saved.cipher))),{title:'Goats: notificaciones activadas',body:'Recibirás un aviso cuando se confirme una compra.',url:'/administracion/ventas',tag:'goats-push-test'}); return reply({ok:true});}
    catch{return fail('No se pudo enviar la prueba. Comprueba los permisos y la configuración del servidor.',503);}
  }
  const cipher=encryptPrivate(JSON.stringify(subscription.data));
  await db.adminPushSubscription.upsert({where:{endpointHash},create:{endpointHash,userId:user.id,cipher},update:{userId:user.id,cipher}});
  return reply({ok:true});
});
export const DELETE = secureMutation(async(req:Request)=>{
  const user=await getUser(); if(user?.role !== 'ADMIN') return fail('Solo administración.',403);
  const parsed=z.object({endpoint:z.string().max(4096).refine(allowedPushEndpoint)}).safeParse(await req.json());
  if(!parsed.success) return fail('Suscripción inválida.',400);
  await db.adminPushSubscription.deleteMany({where:{endpointHash:hash(parsed.data.endpoint),userId:user.id}});
  return reply({ok:true});
});

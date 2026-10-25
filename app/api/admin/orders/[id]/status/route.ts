import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { secureMutation } from '@/lib/security';
import { reply, fail } from '@/lib/http';
const schema=z.object({expectedStatus:z.enum(['ENTREGADO','PENDIENTE_ENTREGA']),status:z.enum(['ENTREGADO','PENDIENTE_ENTREGA'])});
export const PATCH=secureMutation(async(req:Request,{params}:{params:Promise<{id:string}>})=>{
  if((await getUser())?.role!=='ADMIN')return fail('Solo el administrador puede gestionar entregas.',403);
  const parsed=schema.safeParse(await req.json());if(!parsed.success)return fail('Estado de entrega inválido.');
  const {id}=await params;
  const updated=await db.order.updateMany({where:{id,status:parsed.data.expectedStatus},data:{status:parsed.data.status}});
  if(!updated.count)return fail('El pedido no existe o su estado cambió. Recarga antes de continuar.',409);
  return reply({status:parsed.data.status});
});

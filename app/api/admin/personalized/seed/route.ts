import { getUser } from '@/lib/auth';
import { seedPersonalized } from '@/lib/seed-personalized';
import { secureMutation } from '@/lib/security';
import { reply, fail } from '@/lib/http';
export const POST = secureMutation(async () => {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo el administrador puede añadir productos personalizados.', 403);
  return reply(await seedPersonalized());
});

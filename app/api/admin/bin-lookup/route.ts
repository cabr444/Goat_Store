import { getUser } from '@/lib/auth';
import { secureMutation, consumeLimit } from '@/lib/security';
import { binSchema, lookupBin } from '@/lib/bin-lookup';
import { reply, fail } from '@/lib/http';
export const POST = secureMutation(async (req: Request) => {
  const user = await getUser(); if (user?.role !== 'ADMIN') return fail('Solo administración.', 403);
  const parsed = binSchema.safeParse(await req.json());
  if (!parsed.success) return fail('Introduce únicamente un prefijo BIN de 6 u 8 dígitos. No introduzcas números completos de tarjeta.');
  if (!(await consumeLimit(`bin-metadata:${user.id}`, 20))) return fail('Has alcanzado el límite de consultas. Inténtalo más tarde.', 429);
  try { return reply(await lookupBin(parsed.data.bin)); }
  catch (error) { return fail(error instanceof Error && error.message === 'RATE_LIMIT' ? 'El proveedor alcanzó su límite de consultas. Inténtalo más tarde.' : 'No se pudo consultar el proveedor de BIN. Inténtalo más tarde.', error instanceof Error && error.message === 'RATE_LIMIT' ? 429 : 503); }
});

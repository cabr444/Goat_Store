import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { secureMutation } from '@/lib/security';
import { reply, fail } from '@/lib/http';
import { platformAccountSchema, encodePlatformAccount, decodePlatformAccount, platformAccountFailure } from '@/lib/platform-accounts';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo el administrador puede ver estas cuentas.', 403);
  const query = new URL(req.url).searchParams, requested = query.get('page') || '1';
  if (!/^\d{1,6}$/.test(requested)) return fail('Página inválida.');
  try {
    const count = await db.adminPlatformAccount.count(), pages = Math.max(1, Math.ceil(count / 25)), page = Math.max(1, Math.min(Number(requested), pages));
    const rows = await db.adminPlatformAccount.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 25, take: 25 });
    return reply({ accounts: rows.map(row => ({ id: row.id, platform: row.platform, email: decodePlatformAccount(row).email, createdAt: row.createdAt, updatedAt: row.updatedAt })), count, page, pages });
  } catch (error) { return platformAccountFailure(error); }
}
export const POST = secureMutation(async (req: Request) => {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo el administrador puede guardar estas cuentas.', 403);
  const parsed = platformAccountSchema.safeParse(await req.json());
  if (!parsed.success) return fail('Selecciona una plataforma válida, un correo válido y una contraseña de 1 a 128 caracteres.');
  try {
    const data = encodePlatformAccount(parsed.data);
    await db.adminPlatformAccount.upsert({ where: { fingerprint: data.fingerprint }, create: data, update: { cipher: data.cipher } });
    return reply({ ok: true });
  } catch (error) { return platformAccountFailure(error); }
});

import { z } from 'zod';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { secureMutation } from '@/lib/security';
import { fail } from '@/lib/http';
import { csvCell, saleDate } from '@/lib/admin-sales';
import { decodePlatformAccount, platformNames, platformAccountFailure } from '@/lib/platform-accounts';
export const maxDuration = 60;
export const POST = secureMutation(async (req: Request) => {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo el administrador puede exportar estas cuentas.', 403);
  const parsed = z.object({ includePasswords: z.boolean().default(false) }).safeParse(await req.json());
  if (!parsed.success) return fail('Opciones de exportación inválidas.');
  try {
    const accounts = await db.adminPlatformAccount.findMany({ orderBy: [{ platform: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] });
    const rows: unknown[][] = [['ID', 'Plataforma', 'Correo', ...(parsed.data.includePasswords ? ['Contraseña'] : []), 'Fecha de registro (Bogotá)', 'Última actualización (Bogotá)']];
    for (const row of accounts) {
      const value = decodePlatformAccount(row);
      rows.push([row.id, platformNames[value.platform], value.email, ...(parsed.data.includePasswords ? [value.password] : []), saleDate(row.createdAt), saleDate(row.updatedAt)]);
    }
    return new Response('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="cuentas-plataformas-goats.csv"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return platformAccountFailure(error); }
});

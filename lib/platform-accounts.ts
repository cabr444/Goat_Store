import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { accessFingerprint } from './streaming-inventory';
import { encryptPrivate, decryptPrivate } from './private-delivery';
import { reply, fail } from './http';
import { platformKeys } from './platform-account-options';
export { platformNames } from './platform-account-options';
export const platformAccountSchema = z.object({
  platform: z.enum(platformKeys),
  email: z.string().trim().toLowerCase().max(190).pipe(z.email()),
  password: z.string().min(1).max(128).refine(value => !/[\r\n]/.test(value)),
});
export function encodePlatformAccount(value: z.infer<typeof platformAccountSchema>) {
  return { platform: value.platform, fingerprint: accessFingerprint(value.platform, { email: value.email, profile: 'private-admin-register-v1' }), cipher: encryptPrivate(JSON.stringify(value)) };
}
export function decodePlatformAccount(row: { platform: string; cipher: string }) {
  const value = platformAccountSchema.parse(JSON.parse(decryptPrivate(row.cipher)));
  if (value.platform !== row.platform) throw Error('Account platform mismatch');
  return value;
}
export function platformAccountFailure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') return reply({ error: 'Para activar el registro privado, actualiza tu repositorio local y ejecuta npm run db:push con DATABASE_URL apuntando al mismo Neon de Vercel. El catálogo sigue funcionando.', code: 'SCHEMA_UPDATE_REQUIRED' }, 503);
  return fail('No se pudo acceder al registro privado. Revisa la conexión y la configuración de cifrado.', 503);
}

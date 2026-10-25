import { Prisma } from '@prisma/client';
import { fail } from './http';
export function catalogFailure(error: unknown, role?: string) {
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'UNKNOWN';
  // Log only an error code, never database URLs, queries or private access data.
  console.error('Catalog request failed:', code);
  if (code === 'P2022' && role === 'ADMIN') return fail('Falta actualizar el esquema de la base de datos. Ejecuta npm run db:push con DATABASE_URL apuntando a la base de datos de producción (Neon).', 503);
  return fail('El catálogo no está disponible temporalmente. Inténtalo más tarde.', 503);
}

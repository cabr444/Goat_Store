import { Prisma } from '@prisma/client';
import { fail } from './http';
export function catalogFailureCode(error: unknown) {
  const candidate = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : error instanceof Prisma.PrismaClientInitializationError ? error.errorCode : undefined;
  return typeof candidate === 'string' && /^P\d{4}$/.test(candidate) ? candidate : 'UNKNOWN';
}
export function catalogFailure(error: unknown, role?: string) {
  const code = catalogFailureCode(error);
  // Log only a known error code, never connection URLs, queries or private data.
  console.error('Catalog request failed:', code);
  if (role === 'ADMIN') {
    if (code === 'P2022') return fail('Falta actualizar el esquema de la base de datos. Ejecuta npm run db:push con DATABASE_URL apuntando a la base de datos de producción (Neon).', 503);
    if (code === 'P2021') return fail('Faltan tablas en la base de datos conectada. Comprueba que DATABASE_URL de Vercel apunta al proyecto, rama y base correctos antes de actualizar el esquema. Código: P2021.', 503);
    if (code === 'P1000') return fail('La base de datos rechazó las credenciales. Revisa DATABASE_URL del entorno Production en Vercel. Código: P1000.', 503);
    if (['P1001', 'P1002', 'P1017'].includes(code)) return fail(`No se pudo conectar con la base de datos. Revisa que el proyecto esté activo y DATABASE_URL de Production sea correcto. Código: ${code}.`, 503);
    if (code === 'P1003') return fail('No existe la base de datos indicada en DATABASE_URL de Production. Comprueba la conexión del proyecto correcto. Código: P1003.', 503);
  }
  return fail('El catálogo no está disponible temporalmente. Inténtalo más tarde.', 503);
}

import { z } from 'zod';
import { deliverySchema } from './private-delivery';
import { normalizeAccessIdentity } from './streaming-inventory';
export const sharedAccountSchema = z.object({
  productIds: z.array(z.string().min(1).max(100)).min(1).max(20).refine(ids => new Set(ids).size === ids.length),
  account: deliverySchema.omit({ profile: true, pin: true }),
  profiles: z.array(deliverySchema.pick({ profile: true, pin: true })).min(1).max(7)
    .refine(rows => new Set(rows.map(row => normalizeAccessIdentity(row.profile))).size === rows.length),
});

export function sharedAccountValidationMessage(issues: { path: PropertyKey[]; code: string }[]): string {
  const issue = issues[0];
  if (!issue) return 'Revisa los datos de la cuenta.';
  const [section, field, detail] = issue.path;
  if (section === 'account') {
    if (field === 'email') return 'Introduce un solo correo válido o un ID formado únicamente por números. Coloca la contraseña en el campo Clave de la cuenta.';
    if (field === 'password') return 'La clave de la cuenta debe tener entre 1 y 128 caracteres, sin saltos de línea.';
    if (field === 'brand') return 'Completa el encabezado del comprobante (máximo 80 caracteres).';
  }
  if (section === 'productIds') return 'Selecciona entre 1 y 20 planes distintos para esta cuenta.';
  if (section === 'profiles') {
    if (typeof field === 'number') return detail === 'pin'
      ? `Revisa el PIN del perfil ${field + 1}: máximo 40 caracteres, sin saltos de línea. Puedes dejarlo vacío.`
      : `Completa el nombre o número del perfil ${field + 1} (máximo 60 caracteres, sin saltos de línea).`;
    return issue.code === 'custom' ? 'Hay perfiles repetidos. Cada perfil de esta cuenta debe tener un nombre o número distinto.' : 'Añade entre 1 y 7 perfiles para esta cuenta.';
  }
  return 'Revisa los datos de la cuenta antes de guardar.';
}

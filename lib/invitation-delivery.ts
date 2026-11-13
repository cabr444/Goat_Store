import { z } from 'zod';
export function isInvitationProduct(product: { name?: string }) {
  return /^youtube correo personal$/i.test((product.name || '').normalize('NFKC').trim().replace(/\s+/g, ' '));
}
export const invitationSchema = z.object({ kind: z.literal('youtube-invitation'), emails: z.array(z.email().max(190)).max(50) });
export function readInvitation(text: string) {
  try { const parsed = invitationSchema.safeParse(JSON.parse(text)); return parsed.success ? parsed.data : null; } catch { return null; }
}

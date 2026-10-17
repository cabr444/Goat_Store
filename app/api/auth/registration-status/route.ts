import { z } from "zod";
import { db } from "@/lib/db";
import { secureMutation, consumeLimit } from "@/lib/security";
import { tokenHash } from "@/lib/password-reset";
import { reply, fail } from "@/lib/http";
export const POST = secureMutation(async (req: Request) => {
  const parsed = z.object({ ticket: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(await req.json());
  if (!parsed.success) return fail("Solicitud inválida.");
  const digest = tokenHash(parsed.data.ticket);
  if (!await consumeLimit("registration-status:" + digest, 180)) return fail("Espera unos minutos antes de volver a consultar.", 429);
  const pending = await db.pendingRegistration.findUnique({ where: { statusHash: digest }, select: { confirmedAt: true, expiresAt: true } });
  return reply({ status: !pending ? "expired" : pending.confirmedAt ? "confirmed" : pending.expiresAt <= new Date() ? "expired" : "pending" });
});

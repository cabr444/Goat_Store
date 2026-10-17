import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { secureMutation } from "@/lib/security";
import { reply, fail } from "@/lib/http";
import { tokenHash } from "@/lib/password-reset";
const schema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
export const POST = secureMutation(async (req: Request) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail("El enlace no es válido.");
  try {
    const created = await db.$transaction(async tx => {
      const digest = tokenHash(parsed.data.token);
      const pending = await tx.pendingRegistration.findUnique({ where: { tokenHash: digest } });
      if (!pending || pending.confirmedAt || pending.expiresAt <= new Date()) return false;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"registration:" + pending.email}))::text`;
      const used = await tx.pendingRegistration.updateMany({ where: { tokenHash: digest, confirmedAt: null, expiresAt: { gt: new Date() } }, data: { confirmedAt: new Date(), passwordHash: "" } });
      if (used.count !== 1) return false;
      await tx.user.create({ data: { email: pending.email, name: pending.name, passwordHash: pending.passwordHash, role: pending.role } });
      return true;
    });
    if (!created) return fail("El enlace ya fue usado o ha vencido. Vuelve a solicitar la confirmación.");
    return reply({ message: "Correo confirmado. Tu cuenta fue creada; ya puedes iniciar sesión." }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("Este correo ya está registrado. Inicia sesión.", 409);
    return fail("No fue posible confirmar el correo. Inténtalo nuevamente.", 503);
  }
});

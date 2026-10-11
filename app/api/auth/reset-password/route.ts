import { z } from "zod";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { fail, reply } from "@/lib/http";
import { tokenHash } from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    const parsed = z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        password: z.string().min(10).max(128),
      })
      .safeParse(await req.json());
    if (!parsed.success)
      return fail(
        "Revisa el enlace y la contraseña (entre 10 y 128 caracteres).",
      );
    const digest = tokenHash(parsed.data.token);
    const passwordHash = await hash(parsed.data.password, 12);
    const updated = await db.$transaction(async (tx) => {
      const reset = await tx.passwordReset.findUnique({
        where: { tokenHash: digest },
      });
      if (!reset) return false;
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${reset.userId} FOR UPDATE`;
      const consumed = await tx.passwordReset.deleteMany({
        where: { tokenHash: digest, expiresAt: { gt: new Date() } },
      });
      if (!consumed.count) return false;
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.passwordReset.deleteMany({ where: { userId: reset.userId } });
      return true;
    });
    if (!updated)
      return fail("El enlace no es válido o ha vencido. Solicita uno nuevo.");
    return reply({
      message: "Contraseña actualizada. Ya puedes iniciar sesión.",
    });
  } catch {
    return fail(
      "No fue posible restablecer la contraseña. Inténtalo más tarde.",
      500,
    );
  }
}

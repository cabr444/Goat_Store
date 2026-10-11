import { z } from "zod";
import { db } from "@/lib/db";
import { fail, reply } from "@/lib/http";
import {
  emailConfig,
  newResetToken,
  resetMessage,
  sendResetEmail,
  tokenHash,
} from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    const parsed = z
      .object({ email: z.email().max(190) })
      .safeParse(await req.json());
    if (!parsed.success) return fail("Ingresa un correo electrónico válido.");
    emailConfig();
    const user = await db.user.findUnique({
      where: { email: parsed.data.email.toLowerCase().trim() },
    });
    if (user) {
      // Serialize requests for this account, including across server instances.
      const token = newResetToken();
      const digest = tokenHash(token);
      const created = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
        const recent = await tx.passwordReset.findFirst({
          where: {
            userId: user.id,
            createdAt: { gt: new Date(Date.now() - 60000) },
          },
        });
        if (recent) return false;
        await tx.passwordReset.deleteMany({ where: { userId: user.id } });
        await tx.passwordReset.create({
          data: {
            userId: user.id,
            tokenHash: digest,
            expiresAt: new Date(Date.now() + 30 * 60000),
          },
        });
        return true;
      });
      if (created) {
        try {
          await sendResetEmail(user.email, token);
        } catch {
          await db.passwordReset.deleteMany({ where: { tokenHash: digest } });
          console.error("Password reset email delivery failed");
        }
      }
    }
    return reply({ message: resetMessage });
  } catch {
    return fail(
      "No fue posible procesar la solicitud. Inténtalo más tarde.",
      503,
    );
  }
}

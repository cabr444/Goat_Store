import { secureMutation } from "@/lib/security";
import { issueVerification, VerificationError } from "@/lib/email-verification";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
import { hash } from "bcryptjs";
import { z } from "zod";
const schema = z.object({
  name: z.string().trim().min(2).max(90),
  email: z.string().trim().toLowerCase().pipe(z.email().max(190)),
  password: z
    .string()
    .min(10)
    .max(128)
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
  role: z.enum(["CLIENTE", "VENDEDOR"]),
});
async function handlePOST(req: Request) {
  try {
    const v = schema.safeParse(await req.json());
    if (!v.success)
      return fail(
        "Revisa nombre, correo, contraseña (mínimo 10 caracteres) y perfil.",
      );
    const { name, password, role } = v.data;
    const email = v.data.email.toLowerCase().trim();
    const exists = await db.user.findUnique({ where: { email } });
    if (exists) return fail("Este correo ya está registrado.", 409);
    return reply(await issueVerification({ name, email, role, passwordHash: await hash(password, 12) }), 202);
  } catch (error) {
    if (error instanceof VerificationError) return fail(error.message, error.status);
    return fail("No fue posible enviar el correo de confirmación. Inténtalo más tarde.", 503);
  }
}

export const POST = secureMutation(handlePOST);

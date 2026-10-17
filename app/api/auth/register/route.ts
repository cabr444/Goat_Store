import { Prisma } from "@prisma/client";
import { secureMutation } from "@/lib/security";
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
    await db.user.create({ data: { name, email, role, passwordHash: await hash(password, 12) }, select: { id: true } });
    return reply({ message: "Cuenta creada correctamente. Ya puedes iniciar sesión." }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("Este correo ya está registrado.", 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) {
      console.error("[registration:DB_SCHEMA] Run npm run db:push on the application database.");
      return fail("El registro todavía no está preparado en el servidor. Contacta con soporte.", 503);
    }
    console.error("[registration:SERVER] Registration could not be completed.");
    return fail("No fue posible preparar el registro. Inténtalo más tarde.", 503);
  }
}

export const POST = secureMutation(handlePOST);

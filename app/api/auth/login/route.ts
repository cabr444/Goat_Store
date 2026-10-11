import { secureMutation } from "@/lib/security";
import { db } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { reply, fail } from "@/lib/http";
import { compare } from "bcryptjs";
async function handlePOST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.length > 190 ||
      password.length > 128 ||
      !password.length
    )
      return fail("Datos inválidos.");
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    const valid = await compare(
      password,
      user?.passwordHash ||
        "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW",
    );
    if (!user || !valid) return fail("Correo o contraseña incorrectos.", 401);
    await setSession(user.id);
    return reply({ ok: true });
  } catch {
    return fail("Error al iniciar sesión.", 500);
  }
}

export const POST = secureMutation(handlePOST);

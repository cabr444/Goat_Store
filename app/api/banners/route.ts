import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, reply } from "@/lib/http";
export async function GET() {
  if (!(await getUser())) return fail("Inicia sesión.", 401);
  try {
    return reply({
      images: await db.bannerImage.findMany({
        select: { slot: true, updatedAt: true },
        orderBy: { slot: "asc" },
      }),
    });
  } catch {
    return fail("No fue posible cargar las imágenes del banner.", 503);
  }
}

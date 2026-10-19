export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { fail, reply } from "@/lib/http";
export async function GET() {
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

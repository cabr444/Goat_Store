export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { fail, reply } from "@/lib/http";
export async function GET() {
  try {
    return reply({
      images: await db.catalogImageAsset.findMany({
        select: { key: true, updatedAt: true },
      }),
    });
  } catch {
    return fail("No se pudieron cargar las imágenes.", 503);
  }
}

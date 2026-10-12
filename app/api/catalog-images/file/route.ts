import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
export async function GET(req: Request) {
  if (!(await getUser())) return fail("Inicia sesión.", 401);
  const key = new URL(req.url).searchParams.get("key") || "";
  if (key.length > 160) return fail("Imagen inválida.", 404);
  try {
    const image = await db.catalogImageAsset.findUnique({ where: { key } });
    if (!image) return fail("Imagen no encontrada.", 404);
    return new NextResponse(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fail("No se pudo cargar la imagen.", 503);
  }
}

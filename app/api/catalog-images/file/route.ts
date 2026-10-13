import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
export async function GET(req: Request) {
  if (!(await getUser())) return fail("Inicia sesión.", 401);
  const key = new URL(req.url).searchParams.get("key") || "";
  if (key.length > 160) return fail("Imagen inválida.", 404);
  try {
    if (req.headers.has("if-none-match")) {
      const metadata = await db.catalogImageAsset.findUnique({ where: { key }, select: { updatedAt: true } });
      if (metadata) {
        const tag = '"' + metadata.updatedAt.getTime().toString(36) + '"';
        if (req.headers.get("if-none-match") === tag)
          return new NextResponse(null, { status: 304, headers: { "Cache-Control": "private, max-age=0, must-revalidate", ETag: tag } });
      }
    }
    const image = await db.catalogImageAsset.findUnique({ where: { key } });
    if (!image) return fail("Imagen no encontrada.", 404);
    const etag = '"' + image.updatedAt.getTime().toString(36) + '"';
    const cacheHeaders = { "Cache-Control": "private, max-age=0, must-revalidate", ETag: etag };
    if (req.headers.get("if-none-match") === etag)
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    return new NextResponse(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.contentType,
        ...cacheHeaders,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fail("No se pudo cargar la imagen.", 503);
  }
}

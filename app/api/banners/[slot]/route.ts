import { optimizeImage } from "@/lib/image-optimization";
export const dynamic = "force-dynamic";
import { allowedMutationOrigin } from "@/lib/request-origin";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { bannerContentType, maxBannerBytes } from "@/lib/banner-images";
import { secureMutation } from "@/lib/security";
type Context = { params: Promise<{ slot: string }> };
const validSlot = (value: string) => /^[1-6]$/.test(value);
export async function GET(req: Request, { params }: Context) {
  const { slot } = await params;
  if (!validSlot(slot)) return fail("Imagen inválida.", 404);
  try {
    if (req.headers.has("if-none-match")) {
      const metadata = await db.bannerImage.findUnique({ where: { slot: Number(slot) }, select: { updatedAt: true } });
      if (metadata) {
        const tag = '"' + metadata.updatedAt.getTime().toString(36) + '"';
        if (req.headers.get("if-none-match") === tag)
          return new NextResponse(null, { status: 304, headers: { "Cache-Control": "private, max-age=0, must-revalidate", ETag: tag } });
      }
    }
    const image = await db.bannerImage.findUnique({
      where: { slot: Number(slot) },
    });
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
    return fail("No fue posible cargar la imagen.", 503);
  }
}
export async function POST(req: Request, { params }: Context) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN")
    return fail("Solo el administrador puede cambiar el banner.", 403);
  const { slot } = await params;
  if (!validSlot(slot)) return fail("Selecciona una imagen entre 1 y 6.");
  if (!allowedMutationOrigin(req)) return fail("Solicitud no autorizada.", 403);
  const type = req.headers.get("content-type")?.split(";")[0];
  if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(type || ""))
    return fail("Usa una imagen JPG, PNG, WebP o AVIF.", 415);
  if (Number(req.headers.get("content-length")) > maxBannerBytes)
    return fail("La imagen debe pesar máximo 2 MB.", 413);
  try {
    const reader = req.body?.getReader();
    if (!reader) return fail("Selecciona una imagen.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBannerBytes) {
        await reader.cancel();
        return fail("La imagen debe pesar máximo 2 MB.", 413);
      }
      chunks.push(value);
    }
    const data = Buffer.concat(chunks),
      contentType = bannerContentType(data);
    if (!contentType || contentType !== type)
      return fail("El archivo no es una imagen JPG, PNG, WebP o AVIF válida.");
    const optimized = await optimizeImage(data, contentType, "banner");
    const image = await db.bannerImage.upsert({
      where: { slot: Number(slot) },
      create: { slot: Number(slot), ...optimized },
      update: optimized,
      select: { slot: true, updatedAt: true },
    });
    return NextResponse.json(image, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return fail(
      "No se pudo guardar la imagen. Verifica que el esquema de la base de datos esté actualizado.",
      503,
    );
  }
}
async function remove(_req: Request, { params }: Context) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN")
    return fail("Solo el administrador puede cambiar el banner.", 403);
  const { slot } = await params;
  if (!validSlot(slot)) return fail("Imagen inválida.");
  await db.bannerImage.deleteMany({ where: { slot: Number(slot) } });
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export const DELETE = secureMutation(remove);

export const maxDuration = 60;

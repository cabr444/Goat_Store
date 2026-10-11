import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { bannerContentType, maxBannerBytes } from "@/lib/banner-images";
import { secureMutation } from "@/lib/security";
type Context = { params: Promise<{ slot: string }> };
const validSlot = (value: string) => /^[1-6]$/.test(value);
export async function GET(_req: Request, { params }: Context) {
  if (!(await getUser())) return fail("Inicia sesión.", 401);
  const { slot } = await params;
  if (!validSlot(slot)) return fail("Imagen inválida.", 404);
  try {
    const image = await db.bannerImage.findUnique({
      where: { slot: Number(slot) },
    });
    if (!image) return fail("Imagen no encontrada.", 404);
    return new NextResponse(new Uint8Array(image.data), {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, no-store",
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
  const origin = req.headers.get("origin");
  if (
    req.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== new URL(process.env.APP_URL || req.url).origin)
  )
    return fail("Solicitud no autorizada.", 403);
  const type = req.headers.get("content-type")?.split(";")[0];
  if (!["image/jpeg", "image/png", "image/webp"].includes(type || ""))
    return fail("Usa una imagen JPG, PNG o WebP.", 415);
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
      return fail("El archivo no es una imagen JPG, PNG o WebP válida.");
    const image = await db.bannerImage.upsert({
      where: { slot: Number(slot) },
      create: { slot: Number(slot), data, contentType },
      update: { data, contentType },
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

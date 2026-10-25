import { optimizeImage, catalogImageKind } from "@/lib/image-optimization";
import { streamingHighlights, seriesImageKey } from "@/lib/streaming-highlights";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allCategories } from "@/lib/technology-products";
import { readImageUpload } from "@/lib/image-upload";
import { fail, reply } from "@/lib/http";
import { secureMutation } from "@/lib/security";
async function imageKey(req: Request) {
  const params = new URL(req.url).searchParams,
    kind = params.get("kind"),
    key = params.get("key") || "";
  if (kind === "platform" && streamingHighlights.some(platform => platform.id === key)) return "platform:" + key;
  if (kind === "series" && streamingHighlights.some(platform => platform.shows.some(([title]) => seriesImageKey(platform.id, title) === key))) return "series:" + key;
  if (kind === "category" && allCategories.some((c) => c === key))
    return "category:" + key;
  if (
    kind === "product" &&
    /^[a-zA-Z0-9-]{1,80}$/.test(key) &&
    (await db.product.findUnique({ where: { id: key }, select: { id: true } }))
  )
    return "product:" + key;
  return null;
}
export async function POST(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN")
    return fail("Solo el administrador puede cambiar imágenes.", 403);
  try {
    const key = await imageKey(req);
    if (!key) return fail("Imagen no reconocida.");
    const image = await readImageUpload(req);
    if (image instanceof Response) return image;
    const optimized = await optimizeImage(image.data, image.contentType, catalogImageKind(key));
    await db.catalogImageAsset.upsert({
      where: { key },
      create: { key, ...optimized },
      update: optimized,
    });
    return reply({ ok: true });
  } catch {
    return fail(
      "No se pudo guardar la imagen. Verifica el esquema de la base de datos.",
      503,
    );
  }
}
async function remove(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN")
    return fail("Solo el administrador puede cambiar imágenes.", 403);
  const key = await imageKey(req);
  if (!key) return fail("Imagen no reconocida.");
  await db.catalogImageAsset.deleteMany({ where: { key } });
  return reply({ ok: true });
}
export const DELETE = secureMutation(remove);

export const maxDuration = 60;

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
    if (!key) return fail("Producto o categoría inválidos.");
    const image = await readImageUpload(req);
    if (image instanceof Response) return image;
    await db.catalogImageAsset.upsert({
      where: { key },
      create: { key, ...image },
      update: image,
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
  if (!key) return fail("Producto o categoría inválidos.");
  await db.catalogImageAsset.deleteMany({ where: { key } });
  return reply({ ok: true });
}
export const DELETE = secureMutation(remove);

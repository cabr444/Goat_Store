import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
import { secureMutation } from "@/lib/security";
import { publicProduct, publicProductSelect } from "@/lib/catalog-dto";
type Context = { params: Promise<{ id: string }> };
async function duplicate(_req: Request, { params }: Context) {
  const user = await getUser();
  if (!user) return fail("Inicia sesión.", 401);
  if (user.role !== "ADMIN" && user.role !== "VENDEDOR") return fail("No puedes duplicar productos.", 403);
  const { id } = await params;
  const result = await db.$transaction(async tx => {
    const source = await tx.product.findUnique({ where: { id }, select: publicProductSelect });
    if (!source) return { status: 404, error: "Producto no encontrado." };
    if (user.role !== "ADMIN" && source.ownerId !== user.id) return { status: 403, error: "Solo puedes duplicar tus propios productos." };
    // Copy catalog content only. Every copy starts without stock, credentials or allocations.
    let name = source.name;
    while (name.length > 92) name = Array.from(name).slice(0, -1).join("");
    const product = await tx.product.create({
      data: {
        name: name.trimEnd() + " (copia)",
        category: source.category, price: source.price, description: source.description,
        mark: source.mark, gradient: source.gradient, active: true, stock: 0, ownerId: user.id,
      },
      select: publicProductSelect,
    });
    const image = await tx.catalogImageAsset.findUnique({ where: { key: "product:" + id }, select: { data: true, contentType: true } });
    if (image) await tx.catalogImageAsset.create({ data: { key: "product:" + product.id, ...image } });
    return { status: 201, product: publicProduct(product) };
  });
  return "error" in result ? fail(result.error!, result.status) : reply({ product: result.product }, 201);
}
export const POST = secureMutation(duplicate);

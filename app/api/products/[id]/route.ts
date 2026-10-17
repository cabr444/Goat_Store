import { availableAccess } from "@/lib/streaming-inventory";
import { secureMutation } from "@/lib/security";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
import { publicProductSelect, publicProduct } from "@/lib/catalog-dto";
import { productSchema } from "@/lib/product-schema";
async function handlePATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const u = await getUser();
  if (!u) return fail("Inicia sesión.", 401);
  const { id } = await ctx.params;
  const p = await db.product.findUnique({ where: { id } });
  if (!p) return fail("Producto no encontrado.", 404);
  if (u.role !== "ADMIN" && (u.role !== "VENDEDOR" || p.ownerId !== u.id))
    return fail("No puedes modificar este producto.", 403);
  const raw = await req.json();
  const expectedStock = raw?.expectedStock;
  if (
    !Number.isInteger(expectedStock) ||
    expectedStock < 0 ||
    expectedStock > 1000000
  )
    return fail("Reabre el producto para cargar su stock actual.", 409);
  const v = productSchema.safeParse(raw);
  if (!v.success) return fail("Datos inválidos.");
  const updated = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
    const current = await tx.product.findUniqueOrThrow({ where: { id } });
    const inventoryCount = await tx.streamingAccess.count({ where: { productId: id } });
    if (inventoryCount && v.data.category !== "Streaming") return null;
    const stock = current.category === "Streaming" ? await tx.streamingAccess.count({ where: { productId: id, ...availableAccess } }) : current.stock;
    if (stock !== expectedStock) return null;
    await tx.product.update({ where: { id }, data: { ...v.data, stock: v.data.category === "Streaming" ? (current.category === "Streaming" ? stock : 0) : v.data.stock } });
    return tx.product.findUniqueOrThrow({ where: { id }, select: publicProductSelect });
  });
  if (!updated) return fail("El inventario cambió o el producto tiene accesos registrados. Actualiza el producto antes de guardar.", 409);
  return reply({ product: publicProduct(updated) });
}
async function handleDELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const u = await getUser();
  if (!u) return fail("Inicia sesión.", 401);
  const { id } = await ctx.params;
  const p = await db.product.findUnique({ where: { id } });
  if (!p) return fail("Producto no encontrado.", 404);
  if (u.role !== "ADMIN" && (u.role !== "VENDEDOR" || p.ownerId !== u.id))
    return fail("No autorizado.", 403);
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
    await tx.streamingAccess.updateMany({ where: { productId: id, ...availableAccess }, data: { retiredAt: new Date(), version: { increment: 1 } } });
    await tx.product.update({ where: { id }, data: { stock: 0, active: true } });
  });
  return reply({ ok: true });
}

export const PATCH = secureMutation(handlePATCH);

export const DELETE = secureMutation(handleDELETE);

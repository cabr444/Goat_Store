import { isAccountCategory } from "@/lib/account-categories";
import { isFullAccount } from "@/lib/streaming-product-kind";
import { accessForProduct, accessProductIds, syncStreamingStocks } from "@/lib/shared-streaming";
import { platformForProduct } from "@/lib/streaming-platform";
import { comboPools, loadComboInventory, withComboStocks } from "@/lib/combo-inventory";
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
    const inventoryCount = await tx.streamingAccess.count({ where: accessForProduct(id) });
    if (inventoryCount && (!isAccountCategory(v.data.category) || platformForProduct(current.name) !== platformForProduct(v.data.name) || isFullAccount(current.name) !== isFullAccount(v.data.name))) return null;
    const pools = current.category === "Combos" ? comboPools(current, await loadComboInventory(tx, [current])) : [];
    const stock = current.category === "Combos" ? (current.active && pools.length ? Math.min(current.stock, ...pools.map(pool => pool.length)) : 0) : (current.category === "Streaming" || inventoryCount > 0) ? await tx.streamingAccess.count({ where: { ...accessForProduct(id), ...availableAccess } }) : current.stock;
    if (stock !== expectedStock || (current.category === "Combos" && raw.expectedConfiguredStock !== current.stock)) return null;
    await tx.product.update({ where: { id }, data: { ...v.data, stock: (v.data.category === "Streaming" || inventoryCount > 0) ? (isAccountCategory(current.category) ? stock : 0) : v.data.stock } });
    return tx.product.findUniqueOrThrow({ where: { id }, select: publicProductSelect });
  });
  if (!updated) return fail("El inventario cambió o el producto tiene accesos registrados. Actualiza el producto antes de guardar.", 409);
  return reply({ product: (await withComboStocks([publicProduct(updated)]))[0] });
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
    const rows = await tx.streamingAccess.findMany({ where: { ...accessForProduct(id), ...availableAccess } });
    const affected = new Set([id]);
    for (const row of rows) {
      accessProductIds(row).forEach(id => affected.add(id));
      const remaining = accessProductIds(row).filter(productId => productId !== id);
      const changed = await tx.streamingAccess.updateMany({ where: { id: row.id, version: row.version, ...availableAccess }, data: remaining.length
        ? { productId: remaining[0], productIds: remaining.slice(1), version: { increment: 1 } }
        : { retiredAt: new Date(), version: { increment: 1 } } });
      if (changed.count !== 1) throw Error("El acceso cambió durante la operación.");
    }
    await syncStreamingStocks(tx, [...affected]);
    await tx.product.update({ where: { id }, data: { stock: 0, active: true } });
  });
  return reply({ ok: true });
}

export const PATCH = secureMutation(handlePATCH);

export const DELETE = secureMutation(handleDELETE);

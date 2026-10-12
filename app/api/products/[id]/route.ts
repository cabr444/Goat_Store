import { secureMutation } from "@/lib/security";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
import { publicProductSelect } from "@/lib/catalog-dto";
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
  const updated = await db.product.updateMany({
    where: { id, stock: expectedStock },
    data: v.data,
  });
  if (updated.count !== 1)
    return fail(
      "El stock cambió mientras editabas. Cierra y vuelve a abrir el producto antes de guardar.",
      409,
    );
  return reply({
    product: await db.product.findUniqueOrThrow({
      where: { id },
      select: publicProductSelect,
    }),
  });
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
  await db.product.update({ where: { id }, data: { stock: 0, active: true } });
  return reply({ ok: true });
}

export const PATCH = secureMutation(handlePATCH);

export const DELETE = secureMutation(handleDELETE);

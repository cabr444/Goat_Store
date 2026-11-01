import { Prisma } from '@prisma/client';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { secureMutation } from '@/lib/security';
import { reply, fail } from '@/lib/http';
import { deletedProductIds, deletedProductsKind } from '@/lib/deleted-products';
import { removeProductInventory } from '@/lib/remove-product';
export const maxDuration = 60;
export const DELETE = secureMutation(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo el administrador puede eliminar tarjetas.', 403);
  const { id } = await params;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const found = await db.$transaction(async tx => {
        await tx.catalogOrder.upsert({ where: { kind: deletedProductsKind }, create: { kind: deletedProductsKind, ids: [] }, update: {} });
        await tx.$queryRaw`SELECT kind FROM "CatalogOrder" WHERE kind = ${deletedProductsKind} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
        const product = await tx.product.findUnique({ where: { id }, select: { id: true } });
        if (!product) return false;
        const deleted = await deletedProductIds(tx);
        if (deleted.includes(id)) return true;
        await removeProductInventory(tx, id);
        await tx.product.update({ where: { id }, data: { stock: 0, active: false } });
        await tx.catalogOrder.update({ where: { kind: deletedProductsKind }, data: { ids: [...deleted, id], version: { increment: 1 } } });
        return true;
      }, { isolationLevel: 'Serializable', timeout: 30000 });
      return found ? reply({ ok: true }) : fail('Producto no encontrado.', 404);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (['P2034','P2002'].includes(error.code) || (error.code === 'P2010' && ['40001','40P01'].includes(String(error.meta?.code)))) && attempt < 2) continue;
      return fail('No se pudo eliminar la tarjeta. El inventario cambió; actualiza e inténtalo de nuevo.', 409);
    }
  }
  return fail('El inventario cambió. Inténtalo de nuevo.', 409);
});

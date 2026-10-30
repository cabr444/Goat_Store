import { accountCategories } from "@/lib/account-categories";
import { assertAccountMode, AccountModeError } from "@/lib/streaming-account-mode";
import { fullAccountProfile } from "@/lib/streaming-product-kind";
import { Prisma } from '@prisma/client';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { reply, fail } from '@/lib/http';
import { secureMutation } from '@/lib/security';
import { sharedAccountSchema, sharedAccountValidationMessage } from '@/lib/shared-streaming-schema';
import { accessFingerprint, platformForProduct, availableAccess } from '@/lib/streaming-inventory';
import { accessProductIds, syncStreamingStocks } from '@/lib/shared-streaming';
import { deliverySchema, encryptPrivate, decryptPrivate } from '@/lib/private-delivery';
import { isFullAccount } from '@/lib/combo-inventory';
class InventoryError extends Error {}
export const POST = secureMutation(async (req: Request) => {
  if ((await getUser())?.role !== 'ADMIN') return fail('Solo el administrador puede añadir cuentas compartidas entre planes.', 403);
  const parsed = sharedAccountSchema.safeParse(await req.json());
  if (!parsed.success) return fail(sharedAccountValidationMessage(parsed.error.issues));
  const { productIds, account, profiles } = parsed.data;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await db.$transaction(async tx => {
        const products = await tx.product.findMany({ where: { id: { in: productIds }, category: { in: [...accountCategories] } } });
        if (products.length !== productIds.length) throw new InventoryError('Selecciona productos de Streaming, Música o Productividad.');
        const fullAccount = products.every(product => isFullAccount(product.name));
        if (!fullAccount && products.some(product => isFullAccount(product.name))) throw new InventoryError('Selecciona planes de cuenta completa o de perfiles, sin mezclarlos.');
        if (fullAccount && profiles.length !== 1) throw new InventoryError('Una cuenta completa se vende como una sola unidad. Añade únicamente un acceso.');
        const platform = platformForProduct(products[0].name);
        if (products.some(product => platformForProduct(product.name) !== platform)) throw new InventoryError('Todos los planes deben pertenecer a la misma plataforma.');
        const deliveries = profiles.map(profile => deliverySchema.parse({ ...account, ...profile, ...(fullAccount ? {profile:fullAccountProfile} : {}) }));
        if (!fullAccount && deliveries.some(delivery => isFullAccount(delivery.profile))) throw new InventoryError('Para vender una cuenta completa, selecciona un producto de cuenta completa.');
        await assertAccountMode(tx, platform, deliveries, fullAccount);
        let added = 0, linked = 0;
        const affected = new Set(productIds);
        for (const delivery of deliveries) {
          const fingerprint = accessFingerprint(platform, delivery);
          const existing = await tx.streamingAccess.findUnique({ where: { fingerprint } });
          if (existing) {
            if (existing.soldAt || existing.retiredAt) throw new InventoryError('Un perfil de esta cuenta ya fue vendido o retirado y no puede volver al inventario.');
            const previous = deliverySchema.parse(JSON.parse(decryptPrivate(existing.cipher)));
            if (previous.password !== delivery.password || previous.pin !== delivery.pin) throw new InventoryError('El perfil ya existe con otra clave o PIN. Actualízalo en su inventario antes de vincularlo.');
            const all = [...new Set([...accessProductIds(existing), ...productIds])];
            const more = all.filter(id => id !== existing.productId);
            accessProductIds(existing).forEach(id => affected.add(id));
            if (more.length !== existing.productIds.length) {
              const changed = await tx.streamingAccess.updateMany({ where: { id: existing.id, version: existing.version, ...availableAccess }, data: { productIds: more, version: { increment: 1 } } });
              if (!changed.count) throw new InventoryError('El perfil cambió durante la operación. Actualiza el inventario.');
              linked++;
            }
          } else {
            await tx.streamingAccess.create({ data: { productId: productIds[0], productIds: productIds.slice(1), platform, fingerprint, cipher: encryptPrivate(JSON.stringify(delivery)) } });
            added++;
          }
        }
        await syncStreamingStocks(tx, [...affected]);
        return { added, linked, profiles: deliveries.length, fullAccount };
      }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 30000 });
      return reply(result, 201);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code) && attempt < 2) continue;
      if (error instanceof InventoryError || error instanceof AccountModeError) return fail(error.message, 409);
      return fail('No se pudo guardar la cuenta. Revisa el inventario e inténtalo nuevamente.', 503);
    }
  }
  return fail('El inventario cambió. Inténtalo nuevamente.', 409);
});

import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { disabledClientCategories } from "@/lib/store-settings";
import { encryptPrivate, decryptPrivate, deliverySchema, receiptText } from "@/lib/private-delivery";
import { mergeCart, cartSignature } from "@/lib/cart";
import { secureMutation } from "@/lib/security";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
const schema = z.object({
  checkoutKey: z.uuid().optional(),
  items: z.array(z.object({ id: z.string().min(1).max(100), qty: z.number().int().min(1).max(50) })).min(1).max(50),
});
class PurchaseError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Inicia sesión.", 401);
  return reply({ orders: await db.order.findMany({ where: { userId: user.id }, include: { items: { select: { id: true, productId: true, name: true, category: true, quantity: true, unitPrice: true } } }, orderBy: { createdAt: "desc" }, take: 50 }) });
}
function retryable(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002" || (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code))));
}
async function handlePOST(req: Request) {
  const user = await getUser();
  if (!user) return fail("Inicia sesión.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Carrito inválido. Revisa los productos y las cantidades.");
  const items = mergeCart(parsed.data.items).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (items.some(item => item.qty > 50)) return fail("No puedes comprar más de 50 unidades del mismo producto por pedido.");
  const checkoutKey = parsed.data.checkoutKey;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await db.$transaction(async tx => {
        if (checkoutKey) {
          const saved = await tx.checkoutAttempt.findUnique({ where: { key: checkoutKey }, include: { order: { include: { items: { select: { productId: true, quantity: true } } } } } });
          const existing = saved?.order;
          if (existing) {
            if (existing.userId !== user.id || cartSignature(existing.items.map(item => ({ id: item.productId, qty: item.quantity }))) !== cartSignature(items)) throw new PurchaseError("Esta solicitud de compra no corresponde a este carrito.", 409);
            return { order: existing, replayed: true };
          }
        }
        const settings = await tx.storeSettings.findUnique({ where: { id: "main" } });
        const blocked = disabledClientCategories(user.role, settings || { tiendaEnabled: true, segundaEnabled: true });
        const products = await tx.product.findMany({ where: { id: { in: items.map(item => item.id) } } });
        if (products.length !== items.length) throw new PurchaseError("Hay productos que ya no están disponibles. Actualiza tu carrito.");
        const byId = new Map(products.map(product => [product.id, product]));
        let total = 0;
        const accesses = new Map<string, z.infer<typeof deliverySchema>>();
        for (const item of items) {
          const product = byId.get(item.id)!;
          if (blocked.includes(product.category)) throw new PurchaseError("Esta sección está deshabilitada temporalmente para clientes.");
          if (product.stock < item.qty) throw new PurchaseError(`${product.name}: pediste ${item.qty}, pero hay ${product.stock} unidades disponibles.`);
          if (product.category === "Streaming" && !product.deliveryCipher) throw new PurchaseError(`${product.name}: el acceso de streaming aún no está configurado. Contacta con soporte.`);
          if (product.deliveryCipher && ["Streaming", "Música", "Productividad", "Combos"].includes(product.category)) {
            try { accesses.set(product.id, deliverySchema.parse(JSON.parse(decryptPrivate(product.deliveryCipher)))); }
            catch { throw new PurchaseError(`${product.name}: no se pudo preparar el acceso. Contacta con soporte.`, 503); }
          }
          total += product.price * item.qty;
        }
        if (!Number.isSafeInteger(total) || total < 1 || total > 2147483647) throw new PurchaseError("Total inválido.");
        const counter = await tx.orderCounter.upsert({ where: { id: "orders" }, create: { id: "orders", value: 1 }, update: { value: { increment: 1 } } });
        const reference = "P" + counter.value, date = new Date();
        // Reserve all distinct products in one database statement, atomically.
        const values = Prisma.join(items.map(item => Prisma.sql`(${item.id}::text, ${item.qty}::integer)`));
        const reserved = await tx.$executeRaw`UPDATE "Product" AS product SET "stock" = product."stock" - cart.qty FROM (VALUES ${values}) AS cart(id, qty) WHERE product.id = cart.id AND product."stock" >= cart.qty`;
        if (reserved !== items.length) throw new PurchaseError("El stock cambió durante la compra. Revisa las cantidades e inténtalo de nuevo.");
        const debit = await tx.user.updateMany({ where: { id: user.id, balance: { gte: total } }, data: { balance: { decrement: total } } });
        if (!debit.count) throw new PurchaseError("Saldo insuficiente para el total del carrito.");
        const order = await tx.order.create({ data: {
          id: randomUUID(), reference, createdAt: date, userId: user.id, total,
          status: accesses.size === items.length ? "ENTREGADO" : "PENDIENTE_ENTREGA",
          items: { createMany: { data: items.map(item => {
            const product = byId.get(item.id)!, access = accesses.get(item.id);
            return { productId: product.id, category: product.category, sellerId: product.ownerId, name: product.name, quantity: item.qty, unitPrice: product.price, receiptCipher: access ? encryptPrivate(receiptText(access, product.name, reference, date, item.qty, product.price * item.qty)) : null };
          }) } },
        } });
        if (checkoutKey) await tx.checkoutAttempt.create({ data: { key: checkoutKey, orderId: order.id } });
        await tx.walletEvent.create({ data: { userId: user.id, amount: -total, type: "COMPRA", note: `Pedido ${reference}` } });
        return { order, replayed: false };
      }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 });
      return reply({ orderId: result.order.id, reference: result.order.reference, total: result.order.total }, result.replayed ? 200 : 201);
    } catch (error) {
      if (retryable(error) && attempt < 2) continue;
      if (error instanceof PurchaseError) return fail(error.message, error.status);
      return fail(checkoutKey ? "No se pudo completar la compra. Inténtalo de nuevo; el reintento recuperará tu pedido si ya fue confirmado." : "No se pudo completar la compra. Inténtalo de nuevo.", 503);
    }
  }
  return fail("No se pudo completar la compra. Inténtalo de nuevo.", 503);
}
export const POST = secureMutation(handlePOST);

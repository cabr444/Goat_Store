import { randomUUID } from "node:crypto";
import {
  encryptPrivate,
  decryptPrivate,
  deliverySchema,
  receiptText,
} from "@/lib/private-delivery";
import { secureMutation } from "@/lib/security";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
import { z } from "zod";
const schema = z.object({
  items: z
    .array(z.object({ id: z.string(), qty: z.number().int().min(1).max(50) }))
    .min(1)
    .max(50),
});
export async function GET() {
  const u = await getUser();
  if (!u) return fail("Inicia sesión.", 401);
  return reply({
    orders: await db.order.findMany({
      where: { userId: u.id },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            name: true,
            category: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  });
}
async function handlePOST(req: Request) {
  const u = await getUser();
  if (!u) return fail("Inicia sesión.", 401);
  const v = schema.safeParse(await req.json().catch(() => null));
  if (!v.success) return fail("Carrito inválido.");
  if (new Set(v.data.items.map((i) => i.id)).size !== v.data.items.length)
    return fail("No dupliques productos en el pedido.");
  try {
    const order = await db.$transaction(
      async (tx) => {
        const ids = v.data.items.map((i) => i.id);
        const products = await tx.product.findMany({
          where: { id: { in: ids } },
        });
        if (products.length !== ids.length)
          throw new Error("Hay productos no disponibles.");
        const total = v.data.items.reduce(
          (sum, i) =>
            sum + (products.find((p) => p.id === i.id)?.price ?? 0) * i.qty,
          0,
        );
        if (!Number.isSafeInteger(total) || total < 1 || total > 2147483647)
          throw new Error("Total inválido.");
        const counter = await tx.orderCounter.upsert({
          where: { id: "orders" },
          create: { id: "orders", value: 1 },
          update: { value: { increment: 1 } },
        });
        const reference = "P" + counter.value;
        const orderId = randomUUID(),
          date = new Date();
        const delivered = new Map<string, string>();
        for (const item of v.data.items) {
          const product = products.find((p) => p.id === item.id)!;
          if (product.stock < item.qty) throw Error("Stock insuficiente.");
          if (product.category === "Streaming" && !product.deliveryCipher)
            throw Error("El acceso de streaming aún no está configurado.");
          if (
            product.deliveryCipher &&
            ["Streaming", "Música", "Productividad", "Combos"].includes(
              product.category,
            )
          ) {
            const access = deliverySchema.parse(
              JSON.parse(decryptPrivate(product.deliveryCipher)),
            );
            delivered.set(
              product.id,
              encryptPrivate(
                receiptText(
                  access,
                  product.name,
                  reference,
                  date,
                  item.qty,
                  product.price * item.qty,
                ),
              ),
            );
          }
          const reserved = await tx.product.updateMany({
            where: { id: item.id, stock: { gte: item.qty } },
            data: { stock: { decrement: item.qty } },
          });
          if (reserved.count !== 1) throw Error("Stock insuficiente.");
        }
        const debit = await tx.user.updateMany({
          where: { id: u.id, balance: { gte: total } },
          data: { balance: { decrement: total } },
        });
        if (debit.count !== 1) throw new Error("Saldo insuficiente.");
        const order = await tx.order.create({
          data: {
            id: orderId,
            reference,
            createdAt: date,
            status:
              delivered.size === v.data.items.length
                ? "ENTREGADO"
                : "PENDIENTE_ENTREGA",
            userId: u.id,
            total,
            items: {
              create: v.data.items.map((i) => {
                const p = products.find((p) => p.id === i.id)!;
                return {
                  receiptCipher: delivered.get(p.id) || null,
                  productId: p.id,
                  category: p.category,
                  sellerId: p.ownerId,
                  name: p.name,
                  unitPrice: p.price,
                  quantity: i.qty,
                };
              }),
            },
          },
        });
        await tx.walletEvent.create({
          data: {
            userId: u.id,
            amount: -total,
            type: "COMPRA",
            note: `Pedido ${order.reference}`,
          },
        });
        return order;
      },
      { isolationLevel: "Serializable", maxWait: 10000, timeout: 30000 },
    );
    return reply({ orderId: order.id, reference: order.reference, total: order.total }, 201);
  } catch (e) {
    const message =
      e instanceof Error &&
      [
        "Hay productos no disponibles.",
        "Total inválido.",
        "Saldo insuficiente.",
        "Stock insuficiente.",
        "El acceso de streaming aún no está configurado.",
      ].includes(e.message)
        ? e.message
        : "No se pudo realizar la compra. Inténtalo nuevamente.";
    return fail(message, 400);
  }
}

export const POST = secureMutation(handlePOST);

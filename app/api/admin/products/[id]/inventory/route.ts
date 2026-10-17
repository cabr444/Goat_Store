import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
import { secureMutation } from "@/lib/security";
import { deliverySchema, encryptPrivate, decryptPrivate } from "@/lib/private-delivery";
import { accessFingerprint, availableAccess, platformForProduct } from "@/lib/streaming-inventory";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ delivery: deliverySchema, platform: z.string().trim().min(1).max(100), accessId: z.string().max(100).optional(), version: z.number().int().min(0).optional() });
export async function GET(_req: Request, { params }: Context) {
  const user = await getUser();
  if (user?.role !== "ADMIN") return fail("Solo el administrador puede consultar el inventario privado.", 403);
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id }, select: { name: true, category: true, deliveryCipher: true } });
  if (!product) return fail("Producto no encontrado.", 404);
  if (product.category !== "Streaming") return fail("Este inventario es para streaming.");
  const [available, sold, rows] = await Promise.all([
    db.streamingAccess.count({ where: { productId: id, ...availableAccess } }),
    db.streamingAccess.count({ where: { productId: id, soldAt: { not: null } } }),
    db.streamingAccess.findMany({ where: { productId: id, ...availableAccess }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 100 }),
  ]);
  return reply({ platform: platformForProduct(product.name), available, sold, legacy: Boolean(product.deliveryCipher), accesses: rows.map(({ cipher, fingerprint, ...row }) => ({ ...row, delivery: deliverySchema.parse(JSON.parse(decryptPrivate(cipher))) })) });
}
async function mutate(req: Request, { params }: Context) {
  const user = await getUser();
  if (user?.role !== "ADMIN") return fail("Solo el administrador puede modificar accesos.", 403);
  const { id } = await params;
  const body = await req.json();
  const removing = req.method === "DELETE";
  const removal = z.object({ accessId: z.string().min(1).max(100), version: z.number().int().min(0) }).safeParse(body);
  const parsed = schema.safeParse(body);
  if (removing ? !removal.success : !parsed.success) return fail("Revisa plataforma, correo, clave, perfil y PIN.");
  try {
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
      const product = await tx.product.findUnique({ where: { id } });
      if (!product || product.category !== "Streaming") throw Error("PRODUCT");
      if (removing && removal.success) {
        const changed = await tx.streamingAccess.updateMany({ where: { id: removal.data.accessId, productId: id, version: removal.data.version, ...availableAccess }, data: { retiredAt: new Date(), version: { increment: 1 } } });
        if (changed.count !== 1) throw Error("CHANGED");
      } else if (parsed.success) {
        const { delivery, platform, accessId, version } = parsed.data;
        if ((req.method === "PATCH" && (!accessId || version === undefined)) || (req.method === "POST" && accessId)) throw Error("CHANGED");
        const fingerprint = accessFingerprint(platform, delivery);
        // Old receipts stay authoritative: never reintroduce an access already delivered before inventory existed.
        const historic = await tx.orderItem.findMany({ where: { receiptCipher: { not: null }, streamingAccesses: { none: {} }, OR: [{ category: "Streaming" }, { category: "", product: { category: "Streaming" } }] }, select: { name: true, receiptCipher: true } });
        for (const item of historic) {
          if (platformForProduct(item.name) !== platformForProduct(platform)) continue;
          const receipt = decryptPrivate(item.receiptCipher!);
          const email = receipt.match(/📧 Correo: ([^\r\n]+)/)?.[1];
          const profile = receipt.match(/👤 Perfil: ([^\r\n]+)/)?.[1];
          if (email && profile && accessFingerprint(platform, { email, profile }) === fingerprint) throw Error("HISTORIC");
        }
        const data = { platform: platformForProduct(platform), fingerprint, cipher: encryptPrivate(JSON.stringify(delivery)) };
        if (accessId) {
          // Identity is immutable, so editing a password cannot free a previously registered profile for reuse.
          const changed = await tx.streamingAccess.updateMany({ where: { id: accessId, productId: id, fingerprint, version, ...availableAccess }, data: { cipher: data.cipher, version: { increment: 1 } } });
          if (changed.count !== 1) throw Error("CHANGED");
        } else await tx.streamingAccess.create({ data: { productId: id, ...data } });
      }
      const stock = await tx.streamingAccess.count({ where: { productId: id, ...availableAccess } });
      await tx.product.update({ where: { id }, data: { stock } });
      return { stock };
    }, { timeout: 30000 });
    return reply({ ok: true, ...result }, req.method === "POST" ? 201 : 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return fail("Este correo y perfil ya están registrados para esa plataforma, incluso en otro producto o como vendidos/retirados.", 409);
    if (error instanceof Error && error.message === "HISTORIC") return fail("Este acceso ya fue entregado en una compra anterior y no puede volver a venderse.", 409);
    if (error instanceof Error && error.message === "CHANGED") return fail("El acceso cambió, fue vendido o intentaste cambiar su identidad. Actualiza el inventario.", 409);
    if (error instanceof Error && error.message === "PRODUCT") return fail("Producto de streaming no encontrado.", 404);
    return fail("No se pudo actualizar el inventario. Actualiza la página e inténtalo de nuevo.", 503);
  }
}
export const POST = secureMutation(mutate);
export const PATCH = secureMutation(mutate);
export const DELETE = secureMutation(mutate);

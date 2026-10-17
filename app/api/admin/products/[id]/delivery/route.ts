import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fail, reply } from "@/lib/http";
import {
  deliverySchema,
  encryptPrivate,
  decryptPrivate,
} from "@/lib/private-delivery";
import { secureMutation } from "@/lib/security";
import { digitalCategories } from "@/lib/technology-products";
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Context) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN")
    return fail("Solo el administrador puede consultar accesos.", 403);
  try {
    const { id } = await params;
    const product = await db.product.findUnique({
      where: { id },
      select: { deliveryCipher: true },
    });
    if (!product) return fail("Producto no encontrado.", 404);
    return reply({
      delivery: product.deliveryCipher
        ? deliverySchema.parse(
            JSON.parse(decryptPrivate(product.deliveryCipher)),
          )
        : null,
    });
  } catch {
    return fail("No se pudo consultar el acceso.", 503);
  }
}
async function save(req: Request, { params }: Context) {
  const user = await getUser();
  if (!user || user.role !== "ADMIN")
    return fail("Solo el administrador puede guardar accesos.", 403);
  const parsed = deliverySchema.safeParse(await req.json());
  if (!parsed.success) return fail("Revisa correo, clave, perfil y PIN.");
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    select: { category: true },
  });
  if (!product) return fail("Producto no encontrado.", 404);
  if (product.category === "Streaming") return fail("Añade accesos individuales en el inventario de streaming.", 409);
  if (!digitalCategories.some((c) => c === product.category))
    return fail("Los accesos solo se configuran en productos digitales.");
  await db.product.update({
    where: { id },
    data: { deliveryCipher: encryptPrivate(JSON.stringify(parsed.data)) },
  });
  return reply({ ok: true });
}
export const PUT = secureMutation(save);

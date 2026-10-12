import { getStoreOptions, disabledClientCategories } from "@/lib/store-settings";
import { secureMutation } from "@/lib/security";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
import { publicProductSelect } from "@/lib/catalog-dto";
import { productSchema } from "@/lib/product-schema";
export async function GET() {
  const user = await getUser();
  if (!user) return fail("Inicia sesión.", 401);
  const storeOptions = await getStoreOptions();
  return reply({
    storeOptions,
    products: await db.product.findMany({
      where: { category: { notIn: disabledClientCategories(user.role, storeOptions) } },
      select: publicProductSelect,
      orderBy: { createdAt: "asc" },
    }),
  });
}
async function handlePOST(req: Request) {
  const u = await getUser();
  if (!u) return fail("Inicia sesión.", 401);
  if (!["VENDEDOR", "ADMIN"].includes(u.role))
    return fail(
      "Solo vendedores y administradores pueden agregar productos.",
      403,
    );
  try {
    const v = productSchema.safeParse(await req.json());
    if (!v.success) return fail("Información de producto inválida.");
    const product = await db.product.create({
      data: { ...v.data, ownerId: u.id },
      select: publicProductSelect,
    });
    return reply({ product }, 201);
  } catch {
    return fail("No se pudo guardar el producto.", 500);
  }
}

export const POST = secureMutation(handlePOST);

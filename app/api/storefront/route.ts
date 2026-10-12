import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicProductSelect } from "@/lib/catalog-dto";
import { reply, fail } from "@/lib/http";

export async function GET() {
  const user = await getUser();
  if (!user) return fail("Inicia sesión.", 401);
  const [products, orders, users] = await Promise.all([
    db.product.findMany({ select: publicProductSelect, orderBy: { createdAt: "asc" } }),
    db.order.findMany({ where: { userId: user.id }, select: { id: true, total: true, status: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    user.role === "ADMIN" ? db.user.findMany({ select: { id: true, name: true, email: true, role: true, balance: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);
  return reply({ user, products, orders, users });
}

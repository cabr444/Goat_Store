export const dynamic = "force-dynamic";
import { withComboStocks } from "@/lib/combo-inventory";
import { readCardOrders } from "@/lib/catalog-order";
import { getStoreOptions, disabledClientCategories } from "@/lib/store-settings";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicProductSelect, publicProduct } from "@/lib/catalog-dto";
import { reply } from "@/lib/http";

export async function GET() {
  const user = await getUser();
  const storeOptions = await getStoreOptions();
  const blocked = disabledClientCategories(user?.role || "CLIENTE", storeOptions);
  const [products, orders, users, orderRows] = await Promise.all([
    db.product.findMany({ where: { category: { notIn: blocked } }, select: publicProductSelect, orderBy: { createdAt: "asc" } }),
    user ? db.order.findMany({ where: { userId: user.id }, select: { id: true, total: true, status: true }, orderBy: { createdAt: "desc" }, take: 10 }) : Promise.resolve([]),
    user?.role === "ADMIN" ? db.user.findMany({ select: { id: true, name: true, email: true, role: true, balance: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    db.catalogOrder.findMany(),
  ]);
  return reply({ user, products: await withComboStocks(products.map(publicProduct)), orders, users, storeOptions, cardOrders: readCardOrders(orderRows) });
}

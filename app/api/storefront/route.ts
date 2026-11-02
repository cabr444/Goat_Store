import { deletedIdsFromRows, deletedProductsKind } from "@/lib/deleted-products";
import { catalogFailure } from "@/lib/catalog-failure";
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
  try {
    const storeOptions = await getStoreOptions();
    const blocked = disabledClientCategories(user?.role || "CLIENTE", storeOptions);
    const orderRows = await db.catalogOrder.findMany({ where: { kind: { in: ["products", "categories", deletedProductsKind] } } });
    const deleted = deletedIdsFromRows(orderRows);
    const [products, orders, users] = await Promise.all([
      db.product.findMany({ where: { id: { notIn: deleted }, category: { notIn: blocked } }, select: publicProductSelect, orderBy: { createdAt: "asc" } }),
      user ? db.order.findMany({ where: { userId: user.id }, select: { id: true, total: true, status: true }, orderBy: { createdAt: "desc" }, take: 10 }) : Promise.resolve([]),
      user?.role === "ADMIN" ? db.user.findMany({ select: { id: true, name: true, email: true, role: true, balance: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    ]);
    return reply({ user, products: await withComboStocks(products.map(publicProduct)), orders, users, storeOptions, cardOrders: readCardOrders(orderRows) });
  } catch (error) { return catalogFailure(error, user?.role); }
}

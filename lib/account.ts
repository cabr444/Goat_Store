import { decryptPrivate } from "@/lib/private-delivery";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  digitalCategories,
  technologyCategories,
} from "@/lib/technology-products";
import { secondhandCategories } from "@/lib/secondhand-products";
export const cop = (amount: number) =>
  "$" +
  new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(amount);
export const accountDate = (value: Date | string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "America/Bogota",
  }).format(new Date(value));
export { supportLink, rechargeLink, whatsappLink } from "./account-links";
export function orderDepartment(
  category: string,
): "streaming" | "tienda" | "segunda" {
  if (technologyCategories.some((c) => c === category)) return "tienda";
  if (secondhandCategories.some((c) => c === category)) return "segunda";
  return "streaming";
}
export const departmentLabels = {
  streaming: "Streaming y digitales",
  tienda: "Tienda",
  segunda: "Segunda",
};
export const orderSections = [
  "todos",
  "streaming",
  "tienda",
  "segunda",
] as const;
export type OrderSection = (typeof orderSections)[number];
const categoryGroups = {
  streaming: digitalCategories,
  tienda: technologyCategories,
  segunda: secondhandCategories,
};
export function userOrdersWhere(
  userId: string,
  section: OrderSection,
): Prisma.OrderWhereInput {
  if (section === "todos") return { userId };
  const categories = [...categoryGroups[section]];
  return {
    userId,
    items: {
      some: {
        OR: [
          { category: { in: categories } },
          { category: "", product: { category: { in: categories } } },
        ],
      },
    },
  };
}
const recentSelect = {
  id: true,
  productId: true,
  name: true,
  category: true,
  unitPrice: true,
  quantity: true,
  product: { select: { category: true } },
  order: { select: { id: true, createdAt: true, status: true } },
} satisfies Prisma.OrderItemSelect;
export async function getProfileData(userId: string, role: string) {
  const salesWhere: Prisma.OrderItemWhereInput = {
    OR: [
      { sellerId: userId },
      { sellerId: null, product: { ownerId: userId } },
      ...(role === "ADMIN"
        ? [{ sellerId: null, product: { ownerId: null } }]
        : []),
    ],
  };
  const [profile, spent, orderCount, bought, sold] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        balance: true,
        createdAt: true,
      },
    }),
    db.order.aggregate({ where: { userId }, _sum: { total: true } }),
    db.order.count({ where: { userId } }),
    db.orderItem.findMany({
      where: { order: { userId } },
      select: recentSelect,
      orderBy: [{ order: { createdAt: "desc" } }, { id: "desc" }],
      take: 10,
    }),
    role === "CLIENTE"
      ? Promise.resolve([])
      : db.orderItem.findMany({
          where: salesWhere,
          select: recentSelect,
          orderBy: [{ order: { createdAt: "desc" } }, { id: "desc" }],
          take: 10,
        }),
  ]);
  return {
    profile,
    totalSpent: spent._sum.total || 0,
    orderCount,
    bought,
    sold,
  };
}
function readReceipt(cipher: string) {
  try {
    return decryptPrivate(cipher);
  } catch {
    return "No fue posible abrir el acceso guardado. Contacta con soporte.";
  }
}
export async function getOrderHistory(
  userId: string,
  section: OrderSection,
  requestedPage: number,
  orderId?: string,
) {
  const where = {
    ...userOrdersWhere(userId, section),
    ...(orderId ? { id: orderId } : {}),
  };
  const total = await db.order.count({ where });
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.max(1, Math.min(requestedPage, pages));
  const orders = await db.order.findMany({
    where,
    include: {
      items: { include: { product: { select: { category: true } } } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * 20,
    take: 20,
  });
  const safeOrders = orders.map((order) => ({
    ...order,
    items: order.items.map(({ receiptCipher, ...item }) => ({
      ...item,
      receipt: receiptCipher ? readReceipt(receiptCipher) : null,
    })),
  }));
  return { orders: safeOrders, total, page, pages };
}

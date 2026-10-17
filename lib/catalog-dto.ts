import type { Prisma } from "@prisma/client";
export const publicProductSelect = {
  _count: { select: { streamingAccesses: { where: { soldAt: null, retiredAt: null } } } },
  id: true,
  name: true,
  category: true,
  price: true,
  description: true,
  mark: true,
  gradient: true,
  active: true,
  stock: true,
  ownerId: true,
  createdAt: true,
} satisfies Prisma.ProductSelect;

export function publicProduct(product: Prisma.ProductGetPayload<{ select: typeof publicProductSelect }>) {
  const { _count, ...safe } = product;
  return { ...safe, stock: product.category === "Streaming" ? _count.streamingAccesses : product.stock };
}

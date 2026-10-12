import type { Prisma } from "@prisma/client";
export const publicProductSelect = {
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

import { z } from "zod";
import { allCategories } from "@/lib/technology-products";
export const productSchema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(allCategories),
  price: z.number().int().min(1).max(100000000),
  description: z.string().max(1000).default(""),
  mark: z.string().max(25).default("✦"),
  active: z.boolean().default(true),
});

import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { secureMutation } from "@/lib/security";
import { reply, fail } from "@/lib/http";
import { allCategories } from "@/lib/technology-products";
import { moveCard } from "@/lib/catalog-order";
const schema = z.object({ kind: z.enum(["products", "categories"]), id: z.string().min(1).max(100), target: z.string().min(1).max(100), position: z.enum(["before", "after"]), version: z.number().int().min(0) });
export const PUT = secureMutation(async (req: Request) => {
  if ((await getUser())?.role !== "ADMIN") return fail("Solo el administrador puede ordenar tarjetas.", 403);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail("Movimiento inválido.");
  const { kind, id, target, position, version } = parsed.data;
  try {
    const order = await db.$transaction(async tx => {
      const current = await tx.catalogOrder.findUnique({ where: { kind } });
      if ((current?.version || 0) !== version) throw Error("conflict");
      const available = kind === "categories" ? [...allCategories] : (await tx.product.findMany({ select: { id: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] })).map(product => product.id);
      if (!available.includes(id) || !available.includes(target)) throw Error("invalid");
      const saved = Array.isArray(current?.ids) ? current.ids.filter((value): value is string => typeof value === "string" && available.includes(value)) : [];
      const ids = moveCard([...new Set([...saved, ...available])], id, target, position);
      if (current) {
        const changed = await tx.catalogOrder.updateMany({ where: { kind, version }, data: { ids, version: { increment: 1 } } });
        if (!changed.count) throw Error("conflict");
      } else await tx.catalogOrder.create({ data: { kind, ids, version: 1 } });
      return { ids, version: version + 1 };
    });
    return reply({ kind, order });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid") return fail("Tarjeta no encontrada.", 404);
    return fail("El orden cambió. Recarga la página antes de volver a ordenar.", 409);
  }
});

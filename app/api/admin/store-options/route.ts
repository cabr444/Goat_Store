import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reply, fail } from "@/lib/http";
import { secureMutation } from "@/lib/security";
import { getStoreOptions } from "@/lib/store-settings";
export async function GET() {
  const user = await getUser();
  if (user?.role !== "ADMIN") return fail("No autorizado.", 403);
  return reply({ storeOptions: await getStoreOptions() });
}
const schema = z.object({ department: z.enum(["tienda", "segunda"]), enabled: z.boolean() });
export const PUT = secureMutation(async (req: Request) => {
  const user = await getUser();
  if (user?.role !== "ADMIN") return fail("No autorizado.", 403);
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return fail("Opción inválida.");
  const field = parsed.data.department === "tienda" ? "tiendaEnabled" : "segundaEnabled";
  const data = { [field]: parsed.data.enabled };
  const storeOptions = await db.storeSettings.upsert({ where: { id: "main" }, create: { id: "main", ...data }, update: data, select: { tiendaEnabled: true, segundaEnabled: true } });
  return reply({ storeOptions });
});

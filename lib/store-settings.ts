import { db } from "@/lib/db";
import { technologyCategories } from "./technology-products";
import { secondhandCategories } from "./secondhand-products";
export type StoreOptions = { tiendaEnabled: boolean; segundaEnabled: boolean };
export async function getStoreOptions(client = db): Promise<StoreOptions> {
  const settings = await client.storeSettings.findUnique({ where: { id: "main" }, select: { tiendaEnabled: true, segundaEnabled: true } });
  return settings || { tiendaEnabled: true, segundaEnabled: true };
}
export function disabledClientCategories(role: string, options: StoreOptions): string[] {
  if (role !== "CLIENTE") return [];
  return [ ...(!options.tiendaEnabled ? technologyCategories : []), ...(!options.segundaEnabled ? secondhandCategories : []) ];
}

import { homepageSettingsKind, inicioEnabledFromSettings } from "./homepage";
import { legacyStoreCategories } from "./category-names";
import { db } from "@/lib/db";
import { technologyCategories } from "./technology-products";
import { secondhandCategories } from "./secondhand-products";
export type StoreOptions = { tiendaEnabled: boolean; segundaEnabled: boolean; inicioEnabled?: boolean };
export async function getStoreOptions(client = db): Promise<StoreOptions> {
  const settings = await client.storeSettings.findUnique({ where: { id: "main" }, select: { tiendaEnabled: true, segundaEnabled: true } });
  const homepage = await client.catalogOrder.findUnique({ where: { kind: homepageSettingsKind }, select: { ids: true } });
  return { ...(settings || { tiendaEnabled: true, segundaEnabled: true }), inicioEnabled: inicioEnabledFromSettings(homepage?.ids) };
}
export function disabledClientCategories(role: string, options: StoreOptions): string[] {
  if (role !== "CLIENTE") return [];
  return [ ...(!options.tiendaEnabled ? [...technologyCategories, ...legacyStoreCategories] : []), ...(!options.segundaEnabled ? secondhandCategories : []) ];
}

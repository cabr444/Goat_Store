// Keep products and historical orders saved under the previous category names usable.
export const legacyStoreCategories = ["Computadores", "Redes"];
export function categoryName(category: string): string {
  return category === "Computadores" ? "Tecnología" : category === "Redes" ? "Juguetes" : category;
}
export function categoryAliases(category: string): string[] {
  return category === "Tecnología" ? [category, "Computadores"] : category === "Juguetes" ? [category, "Redes"] : [category];
}

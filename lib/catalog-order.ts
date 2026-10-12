export type CardOrder = { ids: string[]; version: number };
export type CardOrders = { products: CardOrder; categories: CardOrder };
export const emptyCardOrders: CardOrders = { products: { ids: [], version: 0 }, categories: { ids: [], version: 0 } };
export function sortCards<T>(items: readonly T[], ids: string[], key: (item: T) => string): T[] {
  const positions = new Map(ids.map((id, index) => [id, index]));
  return [...items].sort((a, b) => (positions.get(key(a)) ?? ids.length) - (positions.get(key(b)) ?? ids.length));
}
export function moveCard(ids: string[], id: string, target: string, position: "before" | "after") {
  if (id === target || !ids.includes(id) || !ids.includes(target)) return ids;
  const next = ids.filter(value => value !== id);
  next.splice(next.indexOf(target) + (position === "after" ? 1 : 0), 0, id);
  return next;
}
export function readCardOrders(rows: { kind: string; ids: unknown; version: number }[]): CardOrders {
  const orders: CardOrders = { products: { ids: [], version: 0 }, categories: { ids: [], version: 0 } };
  for (const row of rows) if (row.kind === "products" || row.kind === "categories") orders[row.kind] = { ids: Array.isArray(row.ids) ? row.ids.filter((id): id is string => typeof id === "string") : [], version: row.version };
  return orders;
}

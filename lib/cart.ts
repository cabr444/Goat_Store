export type CartEntry = { id: string; qty: number };
export function mergeCart(items: readonly CartEntry[]): CartEntry[] {
  const quantities = new Map<string, number>();
  for (const item of items) quantities.set(item.id, (quantities.get(item.id) || 0) + item.qty);
  return [...quantities].map(([id, qty]) => ({ id, qty }));
}
export function cartSignature(items: readonly CartEntry[]) {
  return JSON.stringify(mergeCart(items).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));
}

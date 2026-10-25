import { accessForProducts, accessProductIds, withStreamingStocks } from "./shared-streaming";
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { decryptPrivate, deliverySchema, type Delivery } from './private-delivery';
import { availableAccess, platformForProduct } from './streaming-inventory';
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const platforms: [string, RegExp][] = [
  ['netflix', /\bnetflix\b/gi], ['prime', /\b(?:amazon\s+)?prime(?:\s+video)?\b/gi],
  ['disney', /\bdisney\+?/gi], ['max', /\b(?:hbo\s+)?max\b/gi],
  ['paramount', /\bparamount\+?/gi], ['apple', /\bapple\s*tv\+?/gi],
  ['crunchyroll', /\bcrunchyroll\b/gi], ['youtube', /\byoutube(?:\s+premium)?\b/gi],
  ['vix', /\bvix\b/gi], ['plex', /\bplex\b/gi], ['iptv', /\biptv\b/gi],
];
export function isFullAccount(value: string) {
  return /\b(?:complet[ao]s?|full|entera?s?|entero?s?|total|principal|owner|titular)\b/.test(normalize(value));
}
// Fail closed for unknown platforms, repeated platforms, mismatched sizes or full-account bundles.
export function comboPlatforms(name: string): string[] {
  if (isFullAccount(name)) return [];
  let rest = normalize(name); const result: string[] = [];
  for (const [platform, pattern] of platforms) {
    const matches = rest.match(pattern);
    if (matches && matches.length !== 1) return [];
    if (matches) { result.push(platform); rest = rest.replace(pattern, ' '); }
  }
  const size = rest.match(/\bx\s*(\d+)\b(?!\s*dias)/);
  if (size && Number(size[1]) !== result.length) return [];
  rest = rest.replace(/\bcombo[s]?\b|\bx\s*\d+\b|\b(?:28\s*dias|x28\s*dias|perfiles?|individual(?:es)?)\b/g, ' ').replace(/[\s+:,&()\-]/g, '');
  return result.length >= 2 && !rest ? result : [];
}
export function eligibleComboProduct(product: { name: string; category: string; active: boolean }, platform: string) {
  if (product.category !== 'Streaming' || !product.active || isFullAccount(product.name) || platformForProduct(product.name) !== platform) return false;
  return platform !== 'netflix' || /\b(?:x\s*)?28\s*dias\b/.test(normalize(product.name));
}
type Combo = { id: string; name: string; ownerId: string | null };
type Source = { id: string; name: string; category: string; active: boolean; ownerId: string | null };
export type ComboUnit = { id: string; source: Source; sources: Source[]; delivery: Delivery };
type Snapshot = { units: ComboUnit[]; adminOwners: Set<string> };
type InventoryDB = Pick<Prisma.TransactionClient, 'product' | 'user' | 'streamingAccess'>;
export async function loadComboInventory(client: InventoryDB, combos: Combo[]): Promise<Snapshot> {
  const required = new Set(combos.flatMap(combo => comboPlatforms(combo.name)));
  if (!required.size) return { units: [], adminOwners: new Set() };
  const [products, admins] = await Promise.all([
    client.product.findMany({ where: { category: 'Streaming', active: true }, select: { id: true, name: true, category: true, active: true, ownerId: true } }),
    client.user.findMany({ where: { id: { in: combos.flatMap(combo => combo.ownerId ? [combo.ownerId] : []) }, role: 'ADMIN' }, select: { id: true } }),
  ]);
  const sources = new Map(products.filter(product => [...required].some(platform => eligibleComboProduct(product, platform))).map(product => [product.id, product]));
  const rows = sources.size ? await client.streamingAccess.findMany({ where: { ...accessForProducts([...sources.keys()]), ...availableAccess }, select: { id: true, productId: true, productIds: true, platform: true, cipher: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }) : [];
  const units: ComboUnit[] = [];
  for (const row of rows) {
    try {
      const eligible = accessProductIds(row).flatMap(id => sources.has(id) && row.platform === platformForProduct(sources.get(id)!.name) ? [sources.get(id)!] : []);
      if (!eligible.length) continue;
      const delivery = deliverySchema.parse(JSON.parse(decryptPrivate(row.cipher)));
      if (!isFullAccount(delivery.profile)) units.push({ id: row.id, source: eligible[0], sources: eligible, delivery });
    } catch { /* An unreadable entry must never become saleable combo inventory. */ }
  }
  return { units, adminOwners: new Set(admins.map(admin => admin.id)) };
}
export function comboPools(combo: Combo, snapshot: Snapshot) {
  return comboPlatforms(combo.name).map(platform => snapshot.units.flatMap(unit => {
    const source = unit.sources.find(source => eligibleComboProduct(source, platform) && (!combo.ownerId || snapshot.adminOwners.has(combo.ownerId) || source.ownerId === combo.ownerId));
    return source ? [{ ...unit, source }] : [];
  }));
}
export async function withComboStocks<T extends { id: string; name: string; category: string; ownerId: string | null; stock: number }>(products: T[]): Promise<T[]> {
  products = await withStreamingStocks(products);
  const combos = products.filter(product => product.category === 'Combos');
  if (!combos.length) return products;
  const snapshot = await loadComboInventory(db, combos);
  return products.map(product => {
    if (product.category !== 'Combos') return product;
    if ('active' in product && product.active === false) return { ...product, stock: 0 };
    const pools = comboPools(product, snapshot);
    return { ...product, stock: pools.length ? Math.min(product.stock, ...pools.map(pool => pool.length)) : 0 };
  });
}

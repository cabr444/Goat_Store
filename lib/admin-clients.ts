import { Prisma } from '@prisma/client';
import { db } from './db';
export type ClientFiltersRaw = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';
function amount(value: string | string[] | undefined) {
  const text = first(value).trim();
  return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : undefined;
}
export function clientFilters(raw: ClientFiltersRaw) {
  const min = amount(raw.minimo), max = amount(raw.maximo);
  return { q: first(raw.q).trim().slice(0, 100), min, max, sort: ['mayor', 'menor'].includes(first(raw.orden)) ? first(raw.orden) : 'recientes', invalidRange: min !== undefined && max !== undefined && min > max };
}
export function clientQuery(raw: ClientFiltersRaw, page: number) {
  const filters = clientFilters(raw), query = new URLSearchParams();
  if (filters.q) query.set('q', filters.q);
  if (filters.min !== undefined) query.set('minimo', String(filters.min));
  if (filters.max !== undefined) query.set('maximo', String(filters.max));
  query.set('orden', filters.sort); query.set('pagina', String(page));
  return '?' + query.toString();
}
export async function getAdminClients(raw: ClientFiltersRaw) {
  const filters = clientFilters(raw);
  type Row = { id: string; name: string; email: string; role: string; balance: number; createdAt: Date; orderCount: number; totalSpent: bigint };
  if (filters.invalidRange) return { clients: [] as (Omit<Row, 'totalSpent'> & { totalSpent: number })[], count: 0, pages: 1, page: 1, filters };
  // Aggregate before filtering/pagination; include accounts with no purchases as zero.
  // POSITION treats search text literally (including SQL wildcard characters).
  const grouped = Prisma.sql`SELECT u.id, u.name, u.email, u.role, u.balance, u."createdAt", COUNT(o.id)::int AS "orderCount", COALESCE(SUM(o.total), 0)::bigint AS "totalSpent"
    FROM "User" u LEFT JOIN "Order" o ON o."userId" = u.id
    WHERE (${filters.q} = '' OR POSITION(LOWER(${filters.q}) IN LOWER(u.name)) > 0 OR POSITION(LOWER(${filters.q}) IN LOWER(u.email)) > 0)
    GROUP BY u.id
    HAVING COALESCE(SUM(o.total), 0) >= ${filters.min ?? 0}
    ${filters.max !== undefined ? Prisma.sql`AND COALESCE(SUM(o.total), 0) <= ${filters.max}` : Prisma.empty}`;
  const [result] = await db.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM (${grouped}) clients`);
  const count = Number(result.count), pages = Math.max(1, Math.ceil(count / 25));
  const requested = /^\d{1,6}$/.test(first(raw.pagina)) ? Number(first(raw.pagina)) : 1;
  const page = Math.max(1, Math.min(requested, pages));
  const order = filters.sort === 'mayor' ? Prisma.sql`"totalSpent" DESC, "createdAt" DESC, id DESC` : filters.sort === 'menor' ? Prisma.sql`"totalSpent" ASC, "createdAt" DESC, id DESC` : Prisma.sql`"createdAt" DESC, id DESC`;
  const rows = await db.$queryRaw<Row[]>(Prisma.sql`SELECT * FROM (${grouped}) clients ORDER BY ${order} LIMIT 25 OFFSET ${(page - 1) * 25}`);
  return { clients: rows.map(row => ({ ...row, totalSpent: Number(row.totalSpent) })), count, pages, page, filters };
}

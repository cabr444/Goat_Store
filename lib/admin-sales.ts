import { categoryAliases } from "./category-names";
import { Prisma } from '@prisma/client';
import { db } from './db';
import { allCategories } from './technology-products';
export type RawSalesFilters = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] || '' : value || '';
export function bogotaDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(value + 'T00:00:00-05:00');
  return Number.isFinite(date.getTime()) && new Date(date.getTime() - 5 * 3600000).toISOString().slice(0, 10) === value ? date : undefined;
}
export function salesFilters(raw: RawSalesFilters) {
  const q = first(raw.q).trim().slice(0, 100);
  const candidate = first(raw.estado), category = first(raw.categoria);
  const status = ['ENTREGADO', 'PENDIENTE_ENTREGA'].includes(candidate) ? candidate : '';
  const from = bogotaDay(first(raw.desde)), to = bogotaDay(first(raw.hasta));
  return { q, status, category: (allCategories as readonly string[]).includes(category) ? category : '', from, to };
}
export function salesWhere(filters: ReturnType<typeof salesFilters>): Prisma.OrderWhereInput {
  const AND: Prisma.OrderWhereInput[] = [];
  if (filters.q) AND.push({ OR: [
    { id: { contains: filters.q, mode: 'insensitive' } }, { reference: { contains: filters.q, mode: 'insensitive' } },
    { user: { name: { contains: filters.q, mode: 'insensitive' } } }, { user: { email: { contains: filters.q, mode: 'insensitive' } } },
    { items: { some: { name: { contains: filters.q, mode: 'insensitive' } } } },
  ] });
  if (filters.status) AND.push({ status: filters.status });
  if (filters.category) AND.push({ items: { some: { OR: [{ category: { in: categoryAliases(filters.category) } }, { category: '', product: { category: { in: categoryAliases(filters.category) } } }] } } });
  if (filters.from || filters.to) AND.push({ createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lt: new Date(filters.to.getTime() + 86400000) } : {}) } });
  return AND.length ? { AND } : {};
}
export function salesQuery(raw: RawSalesFilters, page?: number) {
  const filters = salesFilters(raw), params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('estado', filters.status);
  if (filters.category) params.set('categoria', filters.category);
  for (const key of ['desde', 'hasta']) if (bogotaDay(first(raw[key]))) params.set(key, first(raw[key]));
  if (page) params.set('pagina', String(page));
  return params.toString();
}
export const saleSelect = {
  id: true, reference: true, createdAt: true, total: true, status: true,
  user: { select: { id: true, name: true, email: true } },
  items: { select: { id: true, name: true, category: true, quantity: true, unitPrice: true, productId: true, product: { select: { category: true } } } },
} satisfies Prisma.OrderSelect;
export async function getAdminSales(raw: RawSalesFilters) {
  const where = salesWhere(salesFilters(raw));
  const [aggregate, units, pending] = await Promise.all([
    db.order.aggregate({ where, _count: true, _sum: { total: true } }),
    db.orderItem.aggregate({ where: { order: where }, _sum: { quantity: true } }),
    db.order.count({ where: { AND: [where, { status: 'PENDIENTE_ENTREGA' }] } }),
  ]);
  const count = aggregate._count, pages = Math.max(1, Math.ceil(count / 20));
  const requested = /^\d{1,6}$/.test(first(raw.pagina)) ? Number(first(raw.pagina)) : 1;
  const page = Math.max(1, Math.min(requested, pages));
  const orders = await db.order.findMany({ where, select: saleSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 });
  return { orders, count, pages, page, total: aggregate._sum.total || 0, units: units._sum.quantity || 0, pending };
}
export const saleDate = (date: Date) => new Intl.DateTimeFormat('es-CO', {dateStyle:'medium', timeStyle:'short', timeZone:'America/Bogota'}).format(date);
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

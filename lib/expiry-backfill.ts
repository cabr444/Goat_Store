import { Prisma } from '@prisma/client';
import { db } from './db';
import { accountCategories } from './account-categories';
import { decryptPrivate } from './private-delivery';
import { planDuration, reminderDate } from './reminder-time';

export function historicalPlans(item: { name: string; category: string; quantity: number; receiptCipher: string | null }) {
  if (item.category !== 'Combos') {
    const days = planDuration(item.name);
    return days === null ? [] : [{ name: item.name, days, quantity: item.quantity }];
  }
  // Only the immutable receipt can identify the actual source plans of an old combo.
  // Do not use current product names, overrides or credentials to guess old durations.
  if (!item.receiptCipher) return null;
  let text: string; try { text = decryptPrivate(item.receiptCipher); } catch { return null; }
  const labels = [...text.matchAll(/^\*🖥️ Plataforma: ([^\r\n]+)\*$/gm)].map(match => match[1].trim());
  if (!labels.length || labels.some(label => /^combos?\b/i.test(label))) return null;
  const grouped = new Map<string, { name: string; days: number; quantity: number }>();
  for (const name of labels) {
    const days = planDuration(name); if (days === null) continue;
    const key = JSON.stringify([name, days]), previous = grouped.get(key);
    grouped.set(key, { name, days, quantity: (previous?.quantity || 0) + 1 });
  }
  return [...grouped.values()];
}
export async function backfillExpiryReminders(cursor?: string) {
  const categories = [...accountCategories, 'Combos'];
  const kind = 'expiry-history-cutoff-v1';
  let marker;
  try { marker = await db.catalogOrder.upsert({ where: { kind }, create: { kind, ids: { cutoff: new Date().toISOString() } }, update: {} }); }
  catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error; marker = await db.catalogOrder.findUniqueOrThrow({ where: { kind } }); }
  const value = marker.ids as { cutoff?: string };
  const cutoff = new Date(value.cutoff || '');
  if (!Number.isFinite(cutoff.getTime())) throw Error('Invalid history import cutoff');
  return db.$transaction(async tx => {
    const rows = await tx.orderItem.findMany({
      where: { ...(cursor ? { id: { gt: cursor } } : {}), expiryReminders: { none: {} }, order: { createdAt: { lte: cutoff }, user: { role: { not: 'ADMIN' } } }, OR: [{ category: { in: categories } }, { category: '', product: { category: { in: categories } } }] },
      orderBy: { id: 'asc' }, take: 100,
      select: { id: true, name: true, category: true, quantity: true, receiptCipher: true, product: { select: { category: true, reminderDays: true } }, order: { select: { createdAt: true } } },
    });
    let added = 0, skipped = 0, undetermined = 0;
    for (const item of rows) {
      if (item.product.reminderDays === 0) { skipped++; continue; }
      const plans = historicalPlans({ ...item, category: item.category || item.product.category });
      if (plans === null) { undetermined++; continue; }
      if (!plans.length) { skipped++; continue; }
      const result = await tx.expiryReminder.createMany({ data: plans.map((plan, index) => ({ id: `${item.id}:${index}`, orderItemId: item.id, planName: plan.name, quantity: plan.quantity, durationDays: plan.days, dueAt: reminderDate(item.order.createdAt, plan.days) })), skipDuplicates: true });
      added += result.count;
    }
    return { added, skipped, undetermined, more: rows.length === 100, cursor: rows.at(-1)?.id || cursor || '' };
  }, { timeout: 30000 });
}

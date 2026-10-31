// Reminders retain the purchase time; no browser clock or local timezone is used.
export function reminderDate(purchasedAt: Date, days: number) {
  if (!Number.isFinite(purchasedAt.getTime()) || !Number.isInteger(days) || days < 1 || days > 3650) throw Error('Invalid reminder date or interval');
  return new Date(purchasedAt.getTime() + days * 86400000);
}

export function planDuration(name: string, override?: number | null): number | null {
  if (override !== null && override !== undefined) return override === 0 ? null : override;
  const text = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/siempre|vitalici|de por vida|lifetime|permanente/.test(text)) return null;
  const days = text.match(/\b(?:x\s*)?(\d{1,4})\s*(?:dias?|days?)\b/);
  if (days) { const value = Number(days[1]); return value >= 1 && value <= 3650 ? value : null; }
  const units = text.match(/\b(?:x\s*)?(\d{1,2})\s*(mes(?:es)?|months?|semanas?|weeks?|anos?|years?)\b/);
  if (units) { const multiplier = /mes|month/.test(units[2]) ? 30 : /semana|week/.test(units[2]) ? 7 : 365; const value = Number(units[1]) * multiplier; return value >= 1 && value <= 3650 ? value : null; }
  const short = text.match(/\bx\s*(\d{1,4})\b/);
  if (short) { const value = Number(short[1]); return value >= 1 && value <= 3650 ? value : null; }
  if (/anual|annual/.test(text)) return 365;
  return 30; // Editable on each product; never infer duration from numbers like Office 365.
}

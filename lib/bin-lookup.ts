import { z } from 'zod';
export const binSchema = z.object({ bin: z.string().trim().regex(/^(?:\d{6}|\d{8})$/) }).strict();
const label = (value: unknown) => typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, '').slice(0, 120) : '';
export async function lookupBin(bin: string, transport: typeof fetch = fetch) {
  const parsed = binSchema.parse({ bin });
  const response = await transport(`https://lookup.binlist.net/${parsed.bin}`, { headers: { 'Accept-Version': '3' }, signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error' });
  if (response.status === 404) return { found: false as const };
  if (response.status === 429) throw Error('RATE_LIMIT');
  if (!response.ok) throw Error('PROVIDER');
  const data = await response.json();
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('PROVIDER');
  return { found: true as const, scheme: label(data.scheme), type: label(data.type), brand: label(data.brand), country: label(data.country?.name), bank: label(data.bank?.name) };
}

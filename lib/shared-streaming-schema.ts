import { z } from 'zod';
import { deliverySchema } from './private-delivery';
import { normalizeAccessIdentity } from './streaming-inventory';
export const sharedAccountSchema = z.object({
  productIds: z.array(z.string().min(1).max(100)).min(1).max(20).refine(ids => new Set(ids).size === ids.length),
  account: deliverySchema.omit({ profile: true, pin: true }),
  profiles: z.array(deliverySchema.pick({ profile: true, pin: true })).min(1).max(7)
    .refine(rows => new Set(rows.map(row => normalizeAccessIdentity(row.profile))).size === rows.length),
});

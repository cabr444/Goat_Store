import { z } from 'zod';
// Keep identifiers as strings so numeric IDs retain leading zeros.
export const streamingAccountIdentifier = z.string().trim().max(190).pipe(
  z.union([z.email(), z.string().regex(/^[0-9]+$/)]),
);

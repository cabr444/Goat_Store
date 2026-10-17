import { z } from "zod";
import { secureMutation } from "@/lib/security";
import { issueVerification, VerificationError } from "@/lib/email-verification";
import { reply, fail } from "@/lib/http";
export const POST = secureMutation(async (req: Request) => {
  const parsed = z.object({ ticket: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(await req.json());
  if (!parsed.success) return fail("Solicitud inválida.");
  try { return reply(await issueVerification(parsed.data), 202); }
  catch (error) { return fail(error instanceof VerificationError ? error.message : "No fue posible enviar la confirmación.", error instanceof VerificationError ? error.status : 503); }
});

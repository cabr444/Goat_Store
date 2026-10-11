import { secureMutation } from "@/lib/security";
import { clearSession } from "@/lib/auth";
import { reply } from "@/lib/http";
async function handlePOST(_req: Request) {
  await clearSession();
  return reply({ ok: true });
}
export const POST = secureMutation(handlePOST);

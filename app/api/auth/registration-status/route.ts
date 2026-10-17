import { fail } from "@/lib/http";
// Retired: old links/tabs cannot create accounts or send confirmation emails.
export async function POST() {
  return fail("La confirmación de correo ya no es necesaria. Crea tu cuenta directamente desde el registro.", 410);
}

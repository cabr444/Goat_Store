import { verificationMailProblem } from "@/lib/verification-mail-errors";
import { db } from "@/lib/db";
import { emailConfig, newResetToken, tokenHash } from "@/lib/password-reset";
import type { Role } from "@prisma/client";
export const verificationDuration = 30 * 60000;
export const verificationCooldown = 60000;
export class VerificationError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
function verificationConfig() {
  try { return emailConfig(); }
  catch {
    const missing = ["APP_URL", "RESEND_API_KEY", "EMAIL_FROM"].filter(key => !process.env[key]?.trim());
    console.error("[registration:EMAIL_CONFIG]", missing.length ? "Missing server variables: " + missing.join(", ") : "APP_URL must be a valid HTTPS origin (HTTP allowed only for localhost).");
    throw new VerificationError("El envío de confirmaciones no está configurado en el servidor. Contacta con soporte.", 503);
  }
}
export async function sendVerificationEmail(email: string, token: string) {
  const config = verificationConfig();
  const url = `${config.origin}/confirmar-correo?token=${token}`;
  let response: Response;
  try { response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [email], subject: "Confirma tu correo para crear tu cuenta Goat", text: `Todavía no hemos creado tu cuenta de Goat.\n\nPara confirmar tu correo, abre este enlace y pulsa Confirmar correo y crear cuenta:\n${url}\n\nEl enlace vence en 30 minutos y solo se puede usar una vez. Si no solicitaste esta cuenta, ignora este correo; no se creará ningún usuario.` }),
    signal: AbortSignal.timeout(10000),
  }); } catch {
    console.error("[registration:EMAIL_NETWORK] Unable to reach the mail provider or request timed out.");
    throw new VerificationError("No se pudo conectar con el servicio de correo. Inténtalo más tarde.", 503);
  }
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    const problem = verificationMailProblem(response.status, typeof details.name === "string" ? details.name : "", typeof details.message === "string" ? details.message : "");
    // Log only safe classifications; never provider messages, addresses, API keys or tokens.
    console.error(`[registration:${problem.code}] HTTP ${response.status}. ${problem.hint}`);
    throw new VerificationError(problem.text, 503);
  }
}
type Registration = { email: string; name: string; passwordHash: string; role: Role };
export async function issueVerification(input: Registration | { ticket: string }) {
  verificationConfig();
  const token = newResetToken(), ticket = "ticket" in input ? input.ticket : newResetToken();
  const digest = tokenHash(token), statusHash = tokenHash(ticket);
  const saved = await db.$transaction(async tx => {
    const email = "email" in input ? input.email : (await tx.pendingRegistration.findUnique({ where: { statusHash } }))?.email;
    if (!email) throw new VerificationError("La solicitud ha vencido. Regístrate de nuevo.", 400);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"registration:" + email}))::text`;
    if (await tx.user.findUnique({ where: { email }, select: { id: true } })) throw new VerificationError("Este correo ya está registrado.", 409);
    const previous = await tx.pendingRegistration.findUnique({ where: { email } });
    if ("ticket" in input && (!previous || previous.statusHash !== statusHash || previous.confirmedAt)) throw new VerificationError("La solicitud ha vencido. Regístrate de nuevo.", 400);
    if (previous && previous.createdAt.getTime() > Date.now() - verificationCooldown) throw new VerificationError("Espera un minuto antes de solicitar otro correo.", 429);
    const data = { email, name: "name" in input ? input.name : previous!.name, passwordHash: "passwordHash" in input ? input.passwordHash : previous!.passwordHash, role: "role" in input ? input.role : previous!.role, tokenHash: digest, statusHash, createdAt: new Date(), expiresAt: new Date(Date.now() + verificationDuration), confirmedAt: null };
    const pending = await tx.pendingRegistration.upsert({ where: { email }, create: data, update: data });
    return { pending, previous };
  });
  try { await sendVerificationEmail(saved.pending.email, token); }
  catch (error) {
    // Only roll back this specific attempt, never a newer resend or confirmation.
    const where = { email: saved.pending.email, tokenHash: digest, confirmedAt: null };
    if (saved.previous) await db.pendingRegistration.updateMany({ where, data: saved.previous });
    else await db.pendingRegistration.deleteMany({ where });
    if (error instanceof VerificationError) throw error;
    throw new VerificationError("No fue posible enviar el correo de confirmación. Inténtalo más tarde.", 503);
  }
  await db.pendingRegistration.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60000) } } }).catch(() => {});
  return { pending: true, ticket, email: saved.pending.email, expiresAt: saved.pending.expiresAt, message: "Te enviamos un enlace. Confirma tu correo para crear la cuenta." };
}

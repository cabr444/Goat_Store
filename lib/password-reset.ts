import { createHash, randomBytes } from "node:crypto";

export const resetMessage =
  "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newResetToken = () => randomBytes(32).toString("hex");

export function emailConfig() {
  const { APP_URL, RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!APP_URL || !RESEND_API_KEY || !EMAIL_FROM)
    throw new Error("Missing reset email configuration");
  const origin = new URL(APP_URL);
  if (
    origin.protocol !== "https:" &&
    !(
      origin.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(origin.hostname)
    )
  )
    throw new Error("Invalid APP_URL");
  return { origin: origin.origin, apiKey: RESEND_API_KEY, from: EMAIL_FROM };
}

export async function sendResetEmail(email: string, token: string) {
  const config = emailConfig();
  const url = `${config.origin}/restablecer-contrasena?token=${token}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: "Restablece tu contraseña de Goats",
      text: `Para restablecer tu contraseña, abre este enlace:\n${url}\n\nEl enlace vence en 30 minutos y solo se puede usar una vez. Si no lo solicitaste, ignora este correo.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Reset email delivery failed");
}

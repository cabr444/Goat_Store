export function verificationMailProblem(status: number, name: string, providerMessage: string) {
  const message = providerMessage.toLowerCase();
  if (status === 401 || name === "invalid_api_key") return { code: "RESEND_AUTH", text: "El servicio de correo rechazó la configuración de envío. Contacta con soporte.", hint: "Check RESEND_API_KEY in the server environment." };
  if (status === 403 && /testing emails|own email|verify a domain/.test(message)) return { code: "RESEND_TEST_MODE", text: "El servicio de correo está en modo de pruebas y no permite enviar a este destinatario. Contacta con soporte.", hint: "Verify a sending domain in Resend and set EMAIL_FROM to an authorized address." };
  if (/domain.*not.*verified|domain.*not.*verif/.test(message)) return { code: "RESEND_DOMAIN", text: "El remitente de confirmaciones todavía no está autorizado. Contacta con soporte.", hint: "Verify the EMAIL_FROM domain in Resend." };
  if (status === 403) return { code: "RESEND_FORBIDDEN", text: "El servicio de correo no permite enviar con la configuración actual. Contacta con soporte.", hint: "Check the API key permissions and verified sender domain." };
  if (status === 429) return { code: "RESEND_LIMIT", text: "El servicio de correo alcanzó su límite de envíos. Inténtalo más tarde.", hint: "Check the Resend account sending limits." };
  if (status === 400 || status === 422) return { code: "RESEND_VALIDATION", text: "El servicio de correo rechazó el remitente o el destinatario. Contacta con soporte.", hint: "Check EMAIL_FROM formatting and sender verification in Resend." };
  return { code: "RESEND_UNAVAILABLE", text: "El servicio de correo no está disponible temporalmente. Inténtalo más tarde.", hint: "Check Resend service availability and the server connection." };
}

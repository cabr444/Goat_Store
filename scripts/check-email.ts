import { emailConfig } from "../lib/password-reset";
import { db } from "../lib/db";
async function main() {
let failed = false;
for (const key of ["APP_URL", "RESEND_API_KEY", "EMAIL_FROM"]) {
  const configured = Boolean(process.env[key]?.trim());
  console.log(`${key}: ${configured ? "configurada" : "FALTA"}`);
  if (!configured) failed = true;
}
try {
  const config = emailConfig();
  console.log("APP_URL: origen válido.");
  const sender = config.from.match(/<([^<>]+)>/)?.[1] || config.from;
  if (!/^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/.test(sender) || sender.endsWith("@tu-dominio.com")) {
    console.log("EMAIL_FROM: reemplaza el ejemplo por un remitente de tu dominio verificado en Resend."); failed = true;
  }
} catch { console.log("Configuración de correo inválida. Completa .env y usa APP_URL HTTPS en producción."); failed = true; }
try { await db.$queryRaw`SELECT 1 FROM "PendingRegistration" LIMIT 0`; console.log("PendingRegistration: tabla disponible."); }
catch { console.log("Base de datos: comprueba DATABASE_URL y ejecuta npm run db:push."); failed = true; }
finally { await db.$disconnect(); }
console.log("No se enviaron correos ni se mostraron claves. Verifica también el dominio y los límites de tu cuenta en Resend.");
if (failed) process.exitCode = 1;

}
main().catch(() => { console.error("No fue posible comprobar la configuración de correo."); process.exitCode = 1; });

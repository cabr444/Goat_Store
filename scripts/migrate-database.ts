import { migrateStore, MigrationError } from "../lib/database-migration";
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--apply") || args.length > 1) {
  console.error("Usa npm run db:migrate:check o npm run db:migrate:apply."); process.exitCode = 1;
} else {
  void migrateStore({
    sourceURL: process.env.SOURCE_DATABASE_URL || "",
    targetURL: process.env.TARGET_DATABASE_URL || "",
    apply: args.includes("--apply"),
    log: message => console.log(message),
  }).then(() => {
    console.log(args.includes("--apply") ? "Migración completada y confirmada. Ya puedes probar las cuentas anteriores en Neon." : "Comprobación terminada; no se escribió ningún dato.");
  }).catch(error => {
    console.error(error instanceof MigrationError ? error.message : "No se pudo completar la migración. No compartas tus conexiones privadas.");
    process.exitCode = 1;
  });
}

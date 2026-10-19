import { db } from "../lib/db";
import { seedCourses } from "../lib/seed-courses";
seedCourses().then(({ added, updated }) => console.log(`Cursos: ${added} añadidos y ${updated} actualizados. Revisa contenidos, precios y stock antes de vender.`)).catch(() => { console.error("No se pudieron cargar los cursos. Revisa DATABASE_URL y el esquema."); process.exitCode = 1; }).finally(() => db.$disconnect());

import { db } from '../lib/db';
import { seedPersonalized } from '../lib/seed-personalized';
seedPersonalized().then(({ added }) => console.log(`Personalizados: ${added} productos añadidos. Revisa precios y stock antes de vender.`)).catch(() => { console.error('No se pudieron añadir los personalizados. Revisa DATABASE_URL y el esquema.'); process.exitCode = 1; }).finally(() => db.$disconnect());

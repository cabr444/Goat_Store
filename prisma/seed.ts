import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const db = new PrismaClient();
const rows: [string, string, number][] = [
  ["Netflix x28 días", "Streaming", 13000],
  ["Netflix x33 días", "Streaming", 14000],
  ["Amazon Prime Video", "Streaming", 7000],
  ["Disney+", "Streaming", 10000],
  ["HBO Max", "Streaming", 7000],
  ["YouTube Premium", "Streaming", 7000],
  ["Apple TV+", "Streaming", 6000],
  ["Paramount+", "Streaming", 7000],
  ["ViX", "Streaming", 5000],
  ["Crunchyroll", "Streaming", 5000],
  ["Plex", "Streaming", 6000],
  ["Deezer Premium", "Música", 7000],
  ["Tidal", "Música", 5000],
  ["Office 365", "Productividad", 30000],
  ["Netflix x20 días", "Streaming", 8000],
  ["Disney Standard", "Streaming", 5000],
  ["HBO Max Standard", "Streaming", 4000],
  ["IPTV", "Streaming", 8000],
  ["Spotify x3 meses", "Música", 35000],
  ["Netflix individual", "Combos", 12000],
  ["Combo x2: Netflix + Prime Video", "Combos", 15000],
  ["Combo x3: Netflix + Prime Video + Paramount", "Combos", 16000],
  ["Combo x3: Netflix + ViX + Prime Video", "Combos", 16000],
];
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password = process.env.ADMIN_PASSWORD;
  if (
    !email ||
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  )
    throw Error(
      "Configura ADMIN_EMAIL y ADMIN_PASSWORD (12+ caracteres) en .env antes de ejecutar seed",
    );
  const previous = await db.user.findUnique({ where: { email } });
  if (previous && previous.role !== "ADMIN")
    throw Error(
      "El correo administrador ya pertenece a una cuenta no administrativa. Usa otro correo privado.",
    );
  const passwordHash = await hash(password, 12);

  const user = previous
    ? await db.user.update({
        where: { email },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      })
    : await db.user.create({
        data: {
          email,
          name: "Administrador Goat",
          role: "ADMIN",
          passwordHash,
        },
      });
  console.log("Cuenta administrador:", user.email);
  for (const [name, category, price] of rows) {
    const found = await db.product.findFirst({
      where: { name, ownerId: null },
    });
    if (!found)
      await db.product.create({
        data: {
          name,
          category,
          price,
          description:
            category === "Combos"
              ? "Paquete digital. Confirma vigencia, tipo de acceso y condiciones antes de comprar."
              : "Producto digital. Consulta modalidad, vigencia y condiciones de entrega.",
          mark: name.toLowerCase().includes("netflix")
            ? "N"
            : name.includes("Combo")
              ? "PACK"
              : name.includes("Spotify")
                ? "♫"
                : name.slice(0, 12),
          gradient:
            category === "Combos"
              ? "linear-gradient(135deg,#6436e8,#f76ec7)"
              : category === "Música"
                ? "linear-gradient(135deg,#2c1b63,#a14fec)"
                : category === "Productividad"
                  ? "linear-gradient(135deg,#b3332a,#f8a24f)"
                  : "linear-gradient(135deg,#17214e,#543aca,#ca4bb1)",
        },
      });
  }
}
main().finally(() => db.$disconnect());

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { z } from "zod";
const line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !value.includes("\n") && !value.includes("\r"));
export const deliverySchema = z.object({
  brand: line(80).min(1).default("STREAMING LT"),
  email: z.email().max(190),
  password: z
    .string()
    .min(1)
    .max(128)
    .refine((value) => !value.includes("\n") && !value.includes("\r")),
  profile: line(60).min(1),
  pin: line(40).default(""),
});
export type Delivery = z.infer<typeof deliverySchema>;
function key() {
  const secret = process.env.DELIVERY_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw Error("Missing delivery encryption secret");
  return createHash("sha256")
    .update("goat-private-delivery-v1\0" + secret)
    .digest();
}
export function encryptPrivate(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from("goat-private-delivery-v1"));
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return (
    "v1:" +
    iv.toString("base64") +
    ":" +
    cipher.getAuthTag().toString("base64") +
    ":" +
    data.toString("base64")
  );
}
export function decryptPrivate(value: string) {
  const [version, iv, tag, data] = value.split(":");
  if (version !== "v1" || !iv || !tag || !data)
    throw Error("Invalid encrypted delivery");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAAD(Buffer.from("goat-private-delivery-v1"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
export function receiptText(
  delivery: Delivery,
  productName: string,
  orderId: string,
  date: Date,
  quantity: number,
  amount: number | null,
) {
  const bought = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
  return (
    "*👑 " +
    delivery.brand +
    "👑*\n\n*🖥️ Plataforma: " +
    productName.replace(/[\r\n]/g, " ").toLocaleUpperCase("es-CO") +
    "*\n\n📧 Correo: " +
    delivery.email +
    "\n🔑 Clave: " +
    delivery.password +
    "\n👤 Perfil: " +
    delivery.profile +
    "\nPin: " +
    (delivery.pin || "No aplica") +
    "\n\n🧾 Pedido: " +
    orderId +
    "\n📅 Fecha de compra: " +
    bought +
    "\n📦 Cantidad: " +
    quantity +
    (amount === null ? "" : "\n💰 Total: $" + new Intl.NumberFormat("es-CO").format(amount) + " COP") +
    "\n\n⚠️ *IMPORTANTE:* Prohibido cambiar correo, clave o nombre de perfil. Si lo haces perderás la garantía y el acceso inmediatamente.\n\nGracias por tu compra 🛍️"
  );
}

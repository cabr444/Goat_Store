import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
const cookieName = "goat_session";
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32)
    throw new Error("Define AUTH_SECRET (mínimo 32 caracteres)");
  return new TextEncoder().encode(s);
}
export async function setSession(id: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id },
    select: { sessionVersion: true },
  });
  const token = await new SignJWT({ uid: id, sv: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 604800,
  });
}
export async function clearSession() {
  (await cookies()).delete(cookieName);
}
export async function getUser() {
  try {
    const raw = (await cookies()).get(cookieName)?.value;
    if (!raw) return null;
    const { payload } = await jwtVerify(raw, secret());
    if (typeof payload.uid !== "string") return null;
    const user = await db.user.findUnique({
      where: { id: payload.uid },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        balance: true,
        sessionVersion: true,
      },
    });
    if (!user || user.sessionVersion !== (payload.sv ?? 0)) return null;
    return user;
  } catch {
    return null;
  }
}

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./auth";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return null;

  // Reject tokens minted before the password last changed, so a password change
  // or an admin reset signs out sessions elsewhere. Both sides are compared in
  // whole seconds because that is the resolution a JWT's iat carries.
  const issuedAt = session.issuedAt;
  const changedAt = Math.floor(user.credentialsChangedAt.getTime() / 1000);
  if (typeof issuedAt !== "number" || issuedAt < changedAt) return null;

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    // A cookie that is still present but no longer accepted has to be cleared,
    // which only the proxy can do on the way to the login page.
    const cookieStore = await cookies();
    redirect(cookieStore.has(SESSION_COOKIE) ? "/login?session=expired" : "/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}

export async function requireTA() {
  const user = await requireUser();
  if (user.role !== "TA") redirect("/admin");
  return user;
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

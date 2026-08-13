import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET 환경 변수가 설정되지 않았습니다.");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type SessionPayload = {
  sub: string;
  role: "ADMIN" | "TA";
  /** Seconds since the epoch, as issued by setIssuedAt. */
  issuedAt?: number;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ sub: payload.sub, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    // Pinning the algorithm keeps verification from accepting anything the
    // token's own header asks for.
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || (payload.role !== "ADMIN" && payload.role !== "TA")) {
      return null;
    }
    return { sub: payload.sub, role: payload.role, issuedAt: payload.iat };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS };

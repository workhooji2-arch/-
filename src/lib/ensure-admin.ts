import "server-only";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./auth";

let pending: Promise<void> | null = null;

async function syncAdminAccount() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return;

  const existing = await prisma.user.findUnique({ where: { username } });

  if (!existing) {
    await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        role: "ADMIN",
        name: "관리자",
      },
    });
    return;
  }

  const upToDate =
    existing.role === "ADMIN" && (await verifyPassword(password, existing.passwordHash));

  if (!upToDate) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: await hashPassword(password), role: "ADMIN" },
    });
  }
}

/**
 * The admin account comes from environment variables rather than signup, so it
 * is reconciled here instead of at build time — build environments do not
 * always carry the admin variables, and a missing account should not take the
 * whole deployment down. Runs once per server instance, before a login is
 * checked, and retries on the next attempt if it failed.
 */
export function ensureAdminAccount() {
  if (!pending) {
    pending = syncAdminAccount().catch((error) => {
      pending = null;
      console.error("관리자 계정을 준비하지 못했습니다:", error);
    });
  }
  return pending;
}

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { requireTA, setSessionCookie } from "@/lib/session";
import { passwordError, usernameError } from "@/lib/validation";

export type AccountState = { error: string } | { done: string } | undefined;

/**
 * Both changes re-check the current password. The session cookie alone is not
 * enough to hand over the account — an unattended logged-in browser should not
 * be able to lock the owner out.
 */
export async function changeUsernameAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await requireTA();
  const nextUsername = String(formData.get("username") || "").trim();
  const currentPassword = String(formData.get("currentPassword") || "");

  const invalid = usernameError(nextUsername);
  if (invalid) return { error: invalid };

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "현재 비밀번호가 올바르지 않습니다." };
  }

  if (nextUsername === user.username) {
    return { error: "지금 쓰고 있는 아이디와 같습니다." };
  }

  try {
    await prisma.user.update({ where: { id: user.id }, data: { username: nextUsername } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "이미 사용 중인 아이디입니다." };
    }
    throw e;
  }

  revalidatePath("/dashboard/account");
  return { done: `아이디를 "${nextUsername}"(으)로 변경했습니다. 다음 로그인부터 사용하세요.` };
}

export async function changePasswordAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await requireTA();
  const currentPassword = String(formData.get("currentPassword") || "");
  const nextPassword = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  const invalid = passwordError(nextPassword, confirm);
  if (invalid) return { error: invalid };

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { error: "현재 비밀번호가 올바르지 않습니다." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(nextPassword),
      credentialsChangedAt: new Date(),
    },
  });

  // Every session issued before now is void, including this browser's, so it is
  // handed a fresh one — the person who just changed it stays signed in while
  // anyone else is signed out.
  await setSessionCookie({ sub: user.id, role: user.role });

  return { done: "비밀번호를 변경했습니다. 다른 기기에서는 다시 로그인해야 합니다." };
}

"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { ensureAdminAccount } from "@/lib/ensure-admin";
import { SETUP_INCOMPLETE } from "@/lib/messages";

export type FormState = { error: string } | undefined;

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { error: "아이디와 비밀번호를 입력해주세요." };
  }

  await ensureAdminAccount();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  try {
    await setSessionCookie({ sub: user.id, role: user.role });
  } catch (error) {
    console.error("세션을 만들지 못했습니다:", error);
    return { error: SETUP_INCOMPLETE };
  }

  redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
}

"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { SETUP_INCOMPLETE } from "@/lib/messages";

export type FormState = { error: string } | undefined;

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("passwordConfirm") || "");

  if (!username || !name || !password) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { error: "아이디는 영문, 숫자, 밑줄(_)로 3~20자로 입력해주세요." };
  }
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (password !== passwordConfirm) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: { username, name, passwordHash, role: "TA" },
    });
    userId = user.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "이미 사용 중인 아이디입니다." };
    }
    throw e;
  }

  try {
    await setSessionCookie({ sub: userId, role: "TA" });
  } catch (error) {
    console.error("세션을 만들지 못했습니다:", error);
    return { error: SETUP_INCOMPLETE };
  }

  redirect("/dashboard");
}

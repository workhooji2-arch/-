"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type FormState = { error: string } | undefined;

/**
 * Both roles add reimbursements. A TA may only file their own, while an admin
 * files on behalf of whichever TA is selected, so the target is resolved from
 * the caller's role rather than trusted from the form.
 */
export async function addReimbursementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await requireUser();
  const requestedUserId = String(formData.get("userId") || "");
  const targetId = viewer.role === "ADMIN" ? requestedUserId : viewer.id;

  if (!targetId) return { error: "대상 조교를 선택해주세요." };

  if (viewer.role === "ADMIN") {
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target || target.role !== "TA") return { error: "대상 조교를 찾을 수 없습니다." };
  }

  const date = String(formData.get("date") || "");
  const note = String(formData.get("note") || "").trim();
  const amount = Number(formData.get("amount"));

  if (!date) return { error: "날짜를 입력해주세요." };
  if (!note) return { error: "내용을 입력해주세요. (예: 프린터 토너 구매)" };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "금액을 0보다 큰 숫자로 입력해주세요." };
  }

  await prisma.reimbursement.create({
    data: { userId: targetId, date, amount: Math.round(amount), note },
  });

  revalidatePath(viewer.role === "ADMIN" ? "/admin" : "/dashboard");
  return undefined;
}

export async function deleteReimbursementAction(formData: FormData) {
  const viewer = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.reimbursement.deleteMany({
    // A TA can only delete their own; an admin is not restricted.
    where: viewer.role === "ADMIN" ? { id } : { id, userId: viewer.id },
  });

  revalidatePath(viewer.role === "ADMIN" ? "/admin" : "/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isValidDate } from "@/lib/validation";

export type FormState = { error: string } | undefined;

const MAX_QUANTITY = 100_000;

/**
 * Like reimbursements, either role can record piece work: a TA logs their own,
 * an admin logs it for the selected TA. The rate is copied from the TA's
 * current unit rate rather than taken from the form, so nobody can price their
 * own work, and later rate changes leave past entries untouched.
 */
export async function addUnitWorkAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await requireUser();
  const requestedUserId = String(formData.get("userId") || "");
  const targetId = viewer.role === "ADMIN" ? requestedUserId : viewer.id;

  if (!targetId) return { error: "대상 조교를 선택해주세요." };

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.role !== "TA") return { error: "대상 조교를 찾을 수 없습니다." };
  if (!target.unitRate) {
    return { error: "이 조교는 개당 단가가 설정되어 있지 않습니다. 관리자에게 요청하세요." };
  }

  const date = String(formData.get("date") || "");
  const note = String(formData.get("note") || "").trim();
  const quantity = Number(formData.get("quantity"));

  if (!isValidDate(date)) return { error: "날짜를 올바르게 입력해주세요." };
  if (note.length > 200) return { error: "내용은 200자 이내로 입력해주세요." };
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "개수를 1개 이상의 정수로 입력해주세요." };
  }
  if (quantity > MAX_QUANTITY) {
    return { error: `개수가 너무 많습니다. ${MAX_QUANTITY.toLocaleString("ko-KR")}개 이하로 입력해주세요.` };
  }

  await prisma.unitWork.create({
    data: { userId: targetId, date, quantity, rate: target.unitRate, note },
  });

  revalidatePath(viewer.role === "ADMIN" ? "/admin" : "/dashboard");
  return undefined;
}

export async function deleteUnitWorkAction(formData: FormData) {
  const viewer = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.unitWork.deleteMany({
    where: viewer.role === "ADMIN" ? { id } : { id, userId: viewer.id },
  });

  revalidatePath(viewer.role === "ADMIN" ? "/admin" : "/dashboard");
}

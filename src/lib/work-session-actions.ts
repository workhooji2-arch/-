"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { toMinutes } from "@/lib/payroll";
import { isValidDate, isValidTime } from "@/lib/validation";

export type FormState = { error: string } | { saved: true } | undefined;

/**
 * Editing recalculates the hours from the new times but keeps the rate that was
 * stored when the entry was made, so correcting a typo cannot silently reprice
 * past work. A TA may only touch their own rows; an admin may touch any.
 */
export async function updateWorkSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "기록을 찾을 수 없습니다." };

  const existing = await prisma.workSession.findUnique({ where: { id } });
  if (!existing) return { error: "기록을 찾을 수 없습니다." };
  if (viewer.role !== "ADMIN" && existing.userId !== viewer.id) {
    return { error: "본인의 기록만 수정할 수 있습니다." };
  }

  const date = String(formData.get("date") || "");
  const start = String(formData.get("start") || "");
  const end = String(formData.get("end") || "");
  const note = String(formData.get("note") || "").trim();

  if (!isValidDate(date) || !isValidTime(start) || !isValidTime(end)) {
    return { error: "날짜와 시각을 올바르게 입력해주세요." };
  }
  if (note.length > 200) {
    return { error: "업무 내용은 200자 이내로 입력해주세요." };
  }

  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (!(endMin > startMin)) {
    return { error: "퇴근 시각은 출근 시각보다 늦어야 합니다." };
  }

  const hours = Math.round(((endMin - startMin) / 60) * 100) / 100;

  await prisma.workSession.update({
    where: { id },
    data: { date, startTime: start, endTime: end, hours, note },
  });

  revalidatePath(viewer.role === "ADMIN" ? "/admin" : "/dashboard");
  return { saved: true };
}

export async function deleteWorkSessionAction(formData: FormData) {
  const viewer = await requireUser();
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.workSession.deleteMany({
    where: viewer.role === "ADMIN" ? { id } : { id, userId: viewer.id },
  });

  revalidatePath(viewer.role === "ADMIN" ? "/admin" : "/dashboard");
}

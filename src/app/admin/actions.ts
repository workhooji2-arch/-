"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { toMinutes } from "@/lib/payroll";

export type FormState = { error: string } | undefined;

export async function setWageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const wage = Number(formData.get("wage"));
  const memo = String(formData.get("memo") || "").trim();

  if (!userId || !Number.isFinite(wage) || wage <= 0) {
    return { error: "올바른 시급을 입력해주세요." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "TA") {
    return { error: "대상 조교를 찾을 수 없습니다." };
  }

  await prisma.user.update({ where: { id: userId }, data: { wage: Math.round(wage), memo } });
  revalidatePath("/admin");
  return undefined;
}

export async function deleteTaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.user.deleteMany({ where: { id, role: "TA" } });
  revalidatePath("/admin");
}

export async function addSessionForTaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const date = String(formData.get("date") || "");
  const start = String(formData.get("start") || "");
  const end = String(formData.get("end") || "");
  const note = String(formData.get("note") || "").trim();

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "TA") {
    return { error: "대상 조교를 찾을 수 없습니다." };
  }
  if (!target.wage) {
    return { error: "이 조교는 시급이 설정되지 않았습니다. 먼저 조교 관리에서 시급을 설정하세요." };
  }
  if (!date || !start || !end) {
    return { error: "날짜와 시각을 모두 입력해주세요." };
  }
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (!(endMin > startMin)) {
    return { error: "퇴근 시각은 출근 시각보다 늦어야 합니다." };
  }
  const hours = Math.round(((endMin - startMin) / 60) * 100) / 100;

  await prisma.workSession.create({
    data: { userId, date, startTime: start, endTime: end, hours, wage: target.wage, note },
  });

  revalidatePath("/admin");
  return undefined;
}

export async function deleteSessionAdminAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await prisma.workSession.deleteMany({ where: { id } });
  revalidatePath("/admin");
}

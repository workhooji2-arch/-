"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { monthLabel, toMinutes } from "@/lib/payroll";
import { hashPassword } from "@/lib/auth";
import { MAX_WAGE, amountError, isValidDate, isValidTime, passwordError } from "@/lib/validation";

export type FormState = { error: string } | undefined;
export type ResetState = { error: string } | { done: string } | undefined;

/**
 * There is no self-service password recovery, so a TA who forgets theirs needs
 * an admin to set a new one. Only TA accounts can be reset here — the admin's
 * own credentials come from the environment, not the database.
 */
export async function resetTaPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const newPassword = String(formData.get("newPassword") || "");

  const invalid = passwordError(newPassword);
  if (invalid) return { error: invalid };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "TA") return { error: "대상 조교를 찾을 수 없습니다." };

  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      // Signs the TA out everywhere, which is the point when the reset is
      // because someone else may have had access.
      credentialsChangedAt: new Date(),
    },
  });

  revalidatePath("/admin");
  return { done: `${target.name}님의 비밀번호를 재설정했습니다. 새 비밀번호를 전달해주세요.` };
}

/**
 * Sets the hourly rate. Leaving it blank means this TA is not paid by the hour;
 * piece-rate work is set up separately as tasks, since each task has its own
 * rate.
 */
export async function setWageAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const wageInput = String(formData.get("wage") || "").trim();
  const memo = String(formData.get("memo") || "").trim();

  if (!userId) return { error: "대상 조교를 찾을 수 없습니다." };
  if (memo.length > 200) {
    return { error: "비고는 200자 이내로 입력해주세요." };
  }

  let wage: number | null = null;
  if (wageInput) {
    const value = Number(wageInput);
    const bad = amountError(value, MAX_WAGE, "시급");
    if (bad) return { error: bad };
    wage = Math.round(value);
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "TA") {
    return { error: "대상 조교를 찾을 수 없습니다." };
  }

  await prisma.user.update({ where: { id: userId }, data: { wage, memo } });
  revalidatePath("/admin");
  return undefined;
}

/**
 * The budget is stored against the month it belongs to, so entering one for
 * August leaves July alone.
 */
export async function setBudgetAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  await requireAdmin();
  const month = String(formData.get("month") || "").trim();
  const value = Number(String(formData.get("amount") || "").trim());

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return { error: "대상 월을 확인할 수 없습니다." };
  }
  if (!Number.isFinite(value) || value < 0) {
    return { error: "월 예산을 0 이상의 숫자로 입력해주세요." };
  }
  if (value > 10_000_000_000) {
    return { error: "금액이 너무 큽니다." };
  }

  const amount = Math.round(value);
  await prisma.monthlyBudget.upsert({
    where: { month },
    update: { amount },
    create: { month, amount },
  });

  revalidatePath("/admin");
  return { done: `${monthLabel(month)} 예산을 저장했습니다.` };
}

/** Removes just that month's budget; other months keep theirs. */
export async function clearBudgetAction(formData: FormData) {
  await requireAdmin();
  const month = String(formData.get("month") || "").trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return;
  await prisma.monthlyBudget.deleteMany({ where: { month } });
  revalidatePath("/admin");
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

  await prisma.workSession.create({
    data: { userId, date, startTime: start, endTime: end, hours, wage: target.wage, note },
  });

  revalidatePath("/admin");
  return undefined;
}

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { MAX_WAGE, amountError } from "@/lib/validation";

export type HourlyTaskState = { error: string } | { done: string } | undefined;

/**
 * Rates are set by the admin only. A TA choosing their own rate would be
 * choosing their own pay.
 */
export async function addHourlyTaskAction(_prev: HourlyTaskState, formData: FormData): Promise<HourlyTaskState> {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const label = String(formData.get("label") || "").trim();
  const rate = Number(String(formData.get("rate") || "").trim());

  if (!userId) return { error: "대상 조교를 찾을 수 없습니다." };
  if (!label) return { error: "업무 이름을 입력해주세요. (예: 고3 인스터디)" };
  if (label.length > 50) return { error: "업무 이름은 50자 이내로 입력해주세요." };

  const badRate = amountError(rate, MAX_WAGE, "시급");
  if (badRate) return { error: badRate };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "TA") return { error: "대상 조교를 찾을 수 없습니다." };

  try {
    await prisma.hourlyTask.create({ data: { userId, label, rate: Math.round(rate) } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `"${label}" 업무가 이미 있습니다. 이름을 다르게 하거나 기존 시급을 수정하세요.` };
    }
    throw e;
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { done: `"${label}" 업무를 추가했습니다.` };
}

export async function updateHourlyTaskAction(_prev: HourlyTaskState, formData: FormData): Promise<HourlyTaskState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const rate = Number(String(formData.get("rate") || "").trim());

  if (!id) return { error: "업무를 찾을 수 없습니다." };

  const badRate = amountError(rate, MAX_WAGE, "시급");
  if (badRate) return { error: badRate };

  const task = await prisma.hourlyTask.findUnique({ where: { id } });
  if (!task) return { error: "업무를 찾을 수 없습니다." };

  await prisma.hourlyTask.update({ where: { id }, data: { rate: Math.round(rate) } });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { done: `"${task.label}" 시급을 바꿨습니다. 이미 기록된 건의 금액은 그대로입니다.` };
}

export async function deleteHourlyTaskAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;

  // Work already recorded keeps its own label and rate, so removing the task
  // stops it being picked again without rewriting history.
  await prisma.hourlyTask.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

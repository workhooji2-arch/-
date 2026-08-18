"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { toMinutes } from "@/lib/payroll";
import { isValidDate, isValidTime } from "@/lib/validation";

export type FormState = { error: string } | { saved: true } | undefined;

/**
 * Editing is the admin's job: a recorded entry is what the pay is calculated
 * from, so it should not change under the person being paid. The hours are
 * recalculated from the new times while the rate stored at the time is left
 * alone, so a correction cannot reprice past work.
 */
export async function updateWorkSessionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "기록을 찾을 수 없습니다." };

  const existing = await prisma.workSession.findUnique({ where: { id } });
  if (!existing) return { error: "기록을 찾을 수 없습니다." };

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

  // Leaving the task alone keeps the rate the entry was filed with; moving it
  // to another task is a deliberate repricing at that task's current rate.
  const taskId = String(formData.get("taskId") || "");
  let label = existing.label;
  let wage = existing.wage;
  let nextTaskId = existing.taskId;

  if (taskId && taskId !== existing.taskId) {
    const task = await prisma.hourlyTask.findFirst({
      where: { id: taskId, userId: existing.userId },
    });
    if (!task) return { error: "선택한 업무를 찾을 수 없습니다." };
    label = task.label;
    wage = task.rate;
    nextTaskId = task.id;
  }

  await prisma.workSession.update({
    where: { id },
    data: { date, startTime: start, endTime: end, hours, note, label, wage, taskId: nextTaskId },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
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

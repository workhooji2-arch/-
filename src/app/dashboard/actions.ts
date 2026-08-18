"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTA } from "@/lib/session";
import { kstParts, toMinutes } from "@/lib/payroll";
import { isValidDate, isValidTime } from "@/lib/validation";

export type FormState = { error: string } | undefined;

/**
 * The rate depends on which task is being worked, so the task is chosen when
 * clocking in and remembered until clocking out. It is looked up against this
 * TA's own list, never taken on trust from the form.
 */
export async function clockInAction(formData: FormData) {
  const user = await requireTA();
  if (user.currentClockIn) return;

  const taskId = String(formData.get("taskId") || "");
  const task = await prisma.hourlyTask.findFirst({ where: { id: taskId, userId: user.id } });
  if (!task) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { currentClockIn: new Date(), currentTaskId: task.id },
  });
  revalidatePath("/dashboard");
}

export async function clockOutAction() {
  const user = await requireTA();
  if (!user.currentClockIn) return;

  const start = user.currentClockIn;
  const end = new Date();
  const ms = end.getTime() - start.getTime();

  // The task can have been removed while the clock was running; the rate that
  // was in force at clock-in is what the entry keeps.
  const task = user.currentTaskId
    ? await prisma.hourlyTask.findUnique({ where: { id: user.currentTaskId } })
    : null;

  if (ms > 0 && task) {
    const hours = Math.round((ms / 3600000) * 100) / 100;
    const sp = kstParts(start);
    const ep = kstParts(end);
    await prisma.workSession.create({
      data: {
        userId: user.id,
        taskId: task.id,
        label: task.label,
        date: sp.date,
        startTime: sp.time,
        endTime: ep.time,
        hours,
        wage: task.rate,
        note: "출퇴근 기록",
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { currentClockIn: null, currentTaskId: null },
  });
  revalidatePath("/dashboard");
}

export async function addSessionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireTA();

  const taskId = String(formData.get("taskId") || "");
  if (!taskId) return { error: "업무를 선택해주세요." };
  const task = await prisma.hourlyTask.findFirst({ where: { id: taskId, userId: user.id } });
  if (!task) {
    return { error: "선택한 업무를 찾을 수 없습니다. 관리자에게 시급 등록을 요청하세요." };
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

  await prisma.workSession.create({
    data: {
      userId: user.id,
      taskId: task.id,
      label: task.label,
      date,
      startTime: start,
      endTime: end,
      hours,
      wage: task.rate,
      note,
    },
  });

  revalidatePath("/dashboard");
  return undefined;
}

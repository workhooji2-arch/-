"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireTA } from "@/lib/session";
import { kstParts, toMinutes } from "@/lib/payroll";
import { isValidDate, isValidTime } from "@/lib/validation";

export async function clockInAction() {
  const user = await requireTA();
  if (!user.wage || user.currentClockIn) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { currentClockIn: new Date() },
  });
  revalidatePath("/dashboard");
}

export async function clockOutAction() {
  const user = await requireTA();
  if (!user.wage || !user.currentClockIn) return;

  const start = user.currentClockIn;
  const end = new Date();
  const ms = end.getTime() - start.getTime();

  if (ms > 0) {
    const hours = Math.round((ms / 3600000) * 100) / 100;
    const sp = kstParts(start);
    const ep = kstParts(end);
    await prisma.workSession.create({
      data: {
        userId: user.id,
        date: sp.date,
        startTime: sp.time,
        endTime: ep.time,
        hours,
        wage: user.wage,
        note: "출퇴근 기록",
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { currentClockIn: null },
  });
  revalidatePath("/dashboard");
}

export type FormState = { error: string } | undefined;

export async function addSessionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireTA();
  if (!user.wage) {
    return { error: "관리자가 시급을 설정해야 근무를 기록할 수 있습니다." };
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
    data: { userId: user.id, date, startTime: start, endTime: end, hours, wage: user.wage, note },
  });

  revalidatePath("/dashboard");
  return undefined;
}

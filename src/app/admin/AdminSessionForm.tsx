"use client";

import { useActionState } from "react";
import HourlyTaskPicker, { type HourlyTask } from "@/components/HourlyTaskPicker";
import { addSessionForTaAction, type FormState } from "./actions";

export default function AdminSessionForm({
  userId,
  today,
  tasks,
}: {
  userId: string;
  today: string;
  tasks: HourlyTask[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addSessionForTaAction, undefined);

  return (
    <>
      <h3>직접 입력</h3>
      <form action={formAction} className="field-row">
        <input type="hidden" name="userId" value={userId} />
        <div className="field">
          <label htmlFor="date">날짜</label>
          <input id="date" name="date" type="date" defaultValue={today} required />
        </div>
        <HourlyTaskPicker id="a-task" tasks={tasks} />
        <div className="field">
          <label htmlFor="start">출근 시각</label>
          <input id="start" name="start" type="time" required />
        </div>
        <div className="field">
          <label htmlFor="end">퇴근 시각</label>
          <input id="end" name="end" type="time" required />
        </div>
        <div className="field grow">
          <label htmlFor="note">업무 내용 (선택)</label>
          <input id="note" name="note" type="text" placeholder="예: 고3 인스터디 및 모고감독" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "추가 중…" : "기록 추가"}
        </button>
      </form>
      {state?.error ? <div className="error-msg">{state.error}</div> : null}
    </>
  );
}

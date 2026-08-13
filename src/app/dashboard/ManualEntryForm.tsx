"use client";

import { useActionState } from "react";
import { addSessionAction, type FormState } from "./actions";

export default function ManualEntryForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addSessionAction, undefined);

  return (
    <>
      <h3>직접 입력</h3>
      <form action={formAction} className="field-row">
        <div className="field">
          <label htmlFor="date">날짜</label>
          <input id="date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="field">
          <label htmlFor="start">출근 시각</label>
          <input id="start" name="start" type="time" required />
        </div>
        <div className="field">
          <label htmlFor="end">퇴근 시각</label>
          <input id="end" name="end" type="time" required />
        </div>
        <div className="field grow">
          <label htmlFor="note">비고 (선택)</label>
          <input id="note" name="note" type="text" placeholder="예: 실습 보조" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "추가 중…" : "기록 추가"}
        </button>
      </form>
      {state?.error ? <div className="error-msg">{state.error}</div> : null}
    </>
  );
}

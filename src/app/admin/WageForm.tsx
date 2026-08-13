"use client";

import { useActionState, useState } from "react";
import { setWageAction, type FormState } from "./actions";

export default function WageForm({
  userId,
  currentWage,
  currentMemo,
}: {
  userId: string;
  currentWage: number | null;
  currentMemo: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(setWageAction, undefined);

  if (!editing) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
        {currentWage ? "시급 수정" : "시급 설정"}
      </button>
    );
  }

  return (
    <form action={formAction} className="field-row" style={{ marginTop: "0.5rem" }}>
      <input type="hidden" name="userId" value={userId} />
      <div className="field">
        <label>시급(원)</label>
        <input type="number" name="wage" min="1" step="1" defaultValue={currentWage ?? ""} required />
      </div>
      <div className="field grow">
        <label>비고</label>
        <input type="text" name="memo" defaultValue={currentMemo ?? ""} />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
        취소
      </button>
      {state?.error ? <div className="error-msg">{state.error}</div> : null}
    </form>
  );
}

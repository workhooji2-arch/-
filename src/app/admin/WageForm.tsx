"use client";

import { useActionState, useState } from "react";
import { setMemoAction, type FormState } from "./actions";

/** Rates live on the tasks now, so the TA row itself only carries a note. */
export default function MemoForm({
  userId,
  currentMemo,
}: {
  userId: string;
  currentMemo: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(setMemoAction, undefined);

  if (!editing) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
        비고 수정
      </button>
    );
  }

  return (
    <form action={formAction} className="field-row" style={{ marginTop: "0.5rem" }}>
      <input type="hidden" name="userId" value={userId} />
      <div className="field grow">
        <label>비고</label>
        <input type="text" name="memo" defaultValue={currentMemo ?? ""} maxLength={200} />
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

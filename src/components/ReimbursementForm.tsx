"use client";

import { useActionState } from "react";
import { addReimbursementAction, type FormState } from "@/lib/reimbursement-actions";

export default function ReimbursementForm({
  today,
  userId,
}: {
  today: string;
  userId?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addReimbursementAction,
    undefined,
  );

  return (
    <>
      <form action={formAction} className="field-row">
        {userId ? <input type="hidden" name="userId" value={userId} /> : null}
        <div className="field">
          <label htmlFor="r-date">날짜</label>
          <input id="r-date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="field grow">
          <label htmlFor="r-note">내용</label>
          <input id="r-note" name="note" type="text" placeholder="예: 프린터 토너 구매" required />
        </div>
        <div className="field">
          <label htmlFor="r-amount">금액(원)</label>
          <input id="r-amount" name="amount" type="number" min="1" step="1" placeholder="15000" required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "추가 중…" : "실비 추가"}
        </button>
      </form>
      {state?.error ? <div className="error-msg">{state.error}</div> : null}
    </>
  );
}

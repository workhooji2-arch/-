"use client";

import { useActionState } from "react";
import { won } from "@/lib/payroll";
import { addUnitWorkAction, type FormState } from "@/lib/unit-work-actions";

export default function UnitWorkForm({
  today,
  rate,
  userId,
}: {
  today: string;
  rate: number;
  userId?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addUnitWorkAction,
    undefined,
  );

  return (
    <>
      <form action={formAction} className="field-row">
        {userId ? <input type="hidden" name="userId" value={userId} /> : null}
        <div className="field">
          <label htmlFor="q-date">날짜</label>
          <input id="q-date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="field">
          <label htmlFor="q-quantity">개수</label>
          <input
            id="q-quantity"
            name="quantity"
            type="number"
            min="1"
            step="1"
            max="100000"
            placeholder="30"
            required
          />
        </div>
        <div className="field grow">
          <label htmlFor="q-note">내용 (선택)</label>
          <input id="q-note" name="note" type="text" placeholder="예: 과제 채점" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "추가 중…" : "작업 추가"}
        </button>
      </form>
      <div className="hint" style={{ margin: "0.6rem 0 0" }}>
        현재 단가 {won(rate)} / 개 — 개수를 넣으면 금액은 자동으로 계산됩니다.
      </div>
      {state?.error ? <div className="error-msg">{state.error}</div> : null}
    </>
  );
}

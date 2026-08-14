"use client";

import { useActionState, useState } from "react";
import { clearBudgetAction, setBudgetAction } from "./actions";
import type { ResetState } from "./actions";

export default function BudgetForm({
  month,
  monthName,
  currentBudget,
}: {
  month: string;
  monthName: string;
  currentBudget: number;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    setBudgetAction,
    undefined,
  );

  // Close the editor once a save lands. Comparing against the last handled
  // result keeps reopening the form from immediately closing it again.
  const [handled, setHandled] = useState<ResetState>(undefined);
  if (state !== handled && state && "done" in state) {
    setHandled(state);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
        {state && "done" in state ? <span className="done-msg">{state.done}</span> : null}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          {currentBudget > 0 ? `${monthName} 예산 수정` : `${monthName} 예산 입력`}
        </button>
        {currentBudget > 0 ? (
          <form
            action={clearBudgetAction}
            onSubmit={(e) => {
              if (!confirm(`${monthName} 예산을 지울까요? 다른 달의 예산과 근무 기록은 그대로입니다.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="month" value={month} />
            <button type="submit" className="btn btn-danger btn-sm">
              예산 삭제
            </button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="field-row">
      <input type="hidden" name="month" value={month} />
      <div className="field">
        <label htmlFor="budget">{monthName} 내 월급 / 예산(원)</label>
        <input
          id="budget"
          name="amount"
          type="number"
          min="0"
          step="1"
          defaultValue={currentBudget || ""}
          required
          autoFocus
        />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
        취소
      </button>
      {state && "error" in state ? <div className="error-msg">{state.error}</div> : null}
    </form>
  );
}

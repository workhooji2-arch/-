"use client";

import { useActionState, useState } from "react";
import { clearBudgetAction, setBudgetAction } from "./actions";
import type { ResetState } from "./actions";

export default function BudgetForm({ currentBudget }: { currentBudget: number }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    setBudgetAction,
    undefined,
  );

  if (!editing) {
    return (
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
          {currentBudget > 0 ? "월 예산 수정" : "월 예산 설정"}
        </button>
        {currentBudget > 0 ? (
          <form
            action={clearBudgetAction}
            onSubmit={(e) => {
              if (!confirm("월 예산을 지울까요? 근무 기록과 급여는 그대로 남습니다.")) {
                e.preventDefault();
              }
            }}
          >
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
      <div className="field">
        <label htmlFor="budget">내 월급 / 월 예산(원)</label>
        <input
          id="budget"
          name="monthlyBudget"
          type="number"
          min="0"
          step="1"
          defaultValue={currentBudget || ""}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
        취소
      </button>
      {state && "error" in state ? <div className="error-msg">{state.error}</div> : null}
      {state && "done" in state ? <div className="done-msg">{state.done}</div> : null}
    </form>
  );
}

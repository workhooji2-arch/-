"use client";

import { useActionState, useState } from "react";
import { won } from "@/lib/payroll";
import {
  addUnitTaskAction,
  deleteUnitTaskAction,
  updateUnitTaskAction,
  type TaskState,
} from "@/lib/unit-task-actions";

type Task = { id: string; label: string; rate: number };

function Feedback({ state }: { state: TaskState }) {
  if (!state) return null;
  if ("error" in state) return <div className="error-msg">{state.error}</div>;
  return <div className="done-msg">{state.done}</div>;
}

function RateEditor({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<TaskState, FormData>(
    updateUnitTaskAction,
    undefined,
  );

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        단가 수정
      </button>
    );
  }

  return (
    <form action={formAction} className="field-row">
      <input type="hidden" name="id" value={task.id} />
      <div className="field">
        <label>새 단가(원)</label>
        <input type="number" name="rate" min="1" step="1" max="1000000" defaultValue={task.rate} required />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
        닫기
      </button>
      <Feedback state={state} />
    </form>
  );
}

export default function UnitTaskManager({ userId, tasks }: { userId: string; tasks: Task[] }) {
  const [state, formAction, pending] = useActionState<TaskState, FormData>(
    addUnitTaskAction,
    undefined,
  );

  return (
    <>
      {tasks.length ? (
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>업무</th>
                <th className="num">단가</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.label}</td>
                  <td className="num">{won(t.rate)} / 개</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <RateEditor task={t} />
                      <form
                        action={deleteUnitTaskAction}
                        onSubmit={(e) => {
                          if (!confirm(`"${t.label}" 업무를 목록에서 지울까요? 이미 기록된 작업과 금액은 그대로 남습니다.`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="btn btn-danger btn-sm">
                          삭제
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          등록된 업무가 없습니다. 아래에서 업무와 단가를 추가하면 이 조교가 개수 작업을 기록할 수 있습니다.
        </div>
      )}

      <form action={formAction} className="field-row" style={{ marginTop: "1rem" }}>
        <input type="hidden" name="userId" value={userId} />
        <div className="field grow">
          <label>업무 이름</label>
          <input type="text" name="label" placeholder="예: 과제 채점" maxLength={50} required />
        </div>
        <div className="field">
          <label>단가(원/개)</label>
          <input type="number" name="rate" min="1" step="1" max="1000000" placeholder="1200" required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "추가 중…" : "업무 추가"}
        </button>
      </form>
      <Feedback state={state} />
    </>
  );
}

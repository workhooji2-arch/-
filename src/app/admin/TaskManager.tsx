"use client";

import { useActionState, useState } from "react";
import { won } from "@/lib/payroll";

type Task = { id: string; label: string; rate: number };
export type TaskState = { error: string } | { done: string } | undefined;

type Actions = {
  add: (prev: TaskState, formData: FormData) => Promise<TaskState>;
  update: (prev: TaskState, formData: FormData) => Promise<TaskState>;
  remove: (formData: FormData) => Promise<void>;
};

function Feedback({ state }: { state: TaskState }) {
  if (!state) return null;
  if ("error" in state) return <div className="error-msg">{state.error}</div>;
  return <div className="done-msg">{state.done}</div>;
}

function RateEditor({ task, actions, unit }: { task: Task; actions: Actions; unit: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<TaskState, FormData>(
    actions.update,
    undefined,
  );

  const [handled, setHandled] = useState<TaskState>(undefined);
  if (state !== handled && state && "done" in state) {
    setHandled(state);
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        {unit} 수정
      </button>
    );
  }

  return (
    <form action={formAction} className="field-row">
      <input type="hidden" name="id" value={task.id} />
      <div className="field">
        <label>새 {unit}(원)</label>
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

export default function TaskManager({
  userId,
  tasks,
  actions,
  unit,
  perLabel,
  placeholder,
  emptyLabel,
}: {
  userId: string;
  tasks: Task[];
  actions: Actions;
  /** What the figure is called: 시급 or 단가. */
  unit: string;
  /** How the figure reads in the table: "/ 시간" or "/ 개". */
  perLabel: string;
  placeholder: string;
  emptyLabel: string;
}) {
  const [state, formAction, pending] = useActionState<TaskState, FormData>(actions.add, undefined);

  return (
    <>
      {tasks.length ? (
        <div className="table-wrap">
          <table className="ledger">
            <thead>
              <tr>
                <th>업무</th>
                <th className="num">{unit}</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td>{t.label}</td>
                  <td className="num">
                    {won(t.rate)} {perLabel}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <RateEditor task={t} actions={actions} unit={unit} />
                      <form
                        action={actions.remove}
                        onSubmit={(e) => {
                          if (
                            !confirm(
                              `"${t.label}" 업무를 목록에서 지울까요? 이미 기록된 건과 금액은 그대로 남습니다.`,
                            )
                          ) {
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
        <div className="empty-state">{emptyLabel}</div>
      )}

      <form action={formAction} className="field-row" style={{ marginTop: "1rem" }}>
        <input type="hidden" name="userId" value={userId} />
        <div className="field grow">
          <label>업무 이름</label>
          <input type="text" name="label" placeholder={placeholder} maxLength={50} required />
        </div>
        <div className="field">
          <label>{unit}(원)</label>
          <input type="number" name="rate" min="1" step="1" max="1000000" required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "추가 중…" : "업무 추가"}
        </button>
      </form>
      <Feedback state={state} />
    </>
  );
}

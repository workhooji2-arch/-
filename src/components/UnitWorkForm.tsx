"use client";

import { useActionState, useState } from "react";
import { won } from "@/lib/payroll";
import { addUnitWorkAction, type FormState } from "@/lib/unit-work-actions";

type Task = { id: string; label: string; rate: number };

export default function UnitWorkForm({
  today,
  tasks,
  userId,
}: {
  today: string;
  tasks: Task[];
  userId?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addUnitWorkAction,
    undefined,
  );
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");

  const selected = tasks.find((t) => t.id === taskId);
  const preview =
    selected && Number(quantity) > 0 ? selected.rate * Math.floor(Number(quantity)) : null;

  return (
    <>
      <form action={formAction} className="field-row">
        {userId ? <input type="hidden" name="userId" value={userId} /> : null}
        <div className="field">
          <label htmlFor="q-date">날짜</label>
          <input id="q-date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="field grow">
          <label htmlFor="q-task">업무</label>
          <select
            id="q-task"
            name="taskId"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            required
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({won(t.rate)}/개)
              </option>
            ))}
          </select>
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
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </div>
        <div className="field grow">
          <label htmlFor="q-note">비고 (선택)</label>
          <input id="q-note" name="note" type="text" placeholder="예: 3주차 분량" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "추가 중…" : "작업 추가"}
        </button>
      </form>
      {preview !== null ? (
        <div className="hint" style={{ margin: "0.6rem 0 0" }}>
          {selected!.label} {Math.floor(Number(quantity)).toLocaleString("ko-KR")}개 ×{" "}
          {won(selected!.rate)} = <strong>{won(preview)}</strong>
        </div>
      ) : null}
      {state?.error ? <div className="error-msg">{state.error}</div> : null}
    </>
  );
}

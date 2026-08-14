"use client";

import { useActionState, useEffect, useState } from "react";
import { hrs } from "@/lib/payroll";
import {
  deleteWorkSessionAction,
  updateWorkSessionAction,
  type FormState,
} from "@/lib/work-session-actions";

type Row = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  note: string | null;
};

function EditRow({ row, onClose }: { row: Row; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateWorkSessionAction,
    undefined,
  );

  // Close the editor once the save lands, so the row shows the saved values
  // instead of leaving the form open as though nothing happened.
  useEffect(() => {
    if (state && "saved" in state) onClose();
  }, [state, onClose]);

  return (
    <tr>
      <td colSpan={6}>
        <form action={formAction} className="field-row">
          <input type="hidden" name="id" value={row.id} />
          <div className="field">
            <label>날짜</label>
            <input type="date" name="date" defaultValue={row.date} required />
          </div>
          <div className="field">
            <label>출근</label>
            <input type="time" name="start" defaultValue={row.startTime} required />
          </div>
          <div className="field">
            <label>퇴근</label>
            <input type="time" name="end" defaultValue={row.endTime} required />
          </div>
          <div className="field grow">
            <label>업무 내용</label>
            <input type="text" name="note" defaultValue={row.note ?? ""} maxLength={200} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "저장 중…" : "저장"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            취소
          </button>
          {state && "error" in state ? <div className="error-msg">{state.error}</div> : null}
        </form>
      </td>
    </tr>
  );
}

export default function WorkSessionTable({
  rows,
  totalHours,
  emptyLabel,
}: {
  rows: Row[];
  totalHours: number;
  emptyLabel: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!rows.length) return <div className="empty-state">{emptyLabel}</div>;

  return (
    <div className="table-wrap">
      <table className="ledger">
        <thead>
          <tr>
            <th className="num">날짜</th>
            <th className="num">출근</th>
            <th className="num">퇴근</th>
            <th className="num">시간</th>
            <th>업무 내용</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            editingId === r.id ? (
              <EditRow key={r.id} row={r} onClose={() => setEditingId(null)} />
            ) : (
              <tr key={r.id}>
                <td className="num">{r.date}</td>
                <td className="num">{r.startTime}</td>
                <td className="num">{r.endTime}</td>
                <td className="num">{hrs(r.hours)}</td>
                <td>{r.note}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingId(r.id)}
                    >
                      수정
                    </button>
                    <form
                      action={deleteWorkSessionAction}
                      onSubmit={(e) => {
                        if (!confirm("이 근무 기록을 삭제할까요?")) e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="btn btn-danger btn-sm">
                        삭제
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>합계</td>
            <td className="num">{hrs(totalHours)}</td>
            <td></td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

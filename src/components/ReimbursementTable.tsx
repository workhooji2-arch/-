"use client";

import { useActionState, useEffect, useState } from "react";
import { won } from "@/lib/payroll";
import {
  deleteReimbursementAction,
  updateReimbursementAction,
  type EditState,
} from "@/lib/reimbursement-actions";

type Row = { id: string; date: string; note: string; amount: number };

function EditRow({ row, onClose, span }: { row: Row; onClose: () => void; span: number }) {
  const [state, formAction, pending] = useActionState<EditState, FormData>(
    updateReimbursementAction,
    undefined,
  );

  useEffect(() => {
    if (state && "saved" in state) onClose();
  }, [state, onClose]);

  return (
    <tr>
      <td colSpan={span}>
        <form action={formAction} className="field-row">
          <input type="hidden" name="id" value={row.id} />
          <div className="field">
            <label>날짜</label>
            <input type="date" name="date" defaultValue={row.date} required />
          </div>
          <div className="field grow">
            <label>내용</label>
            <input type="text" name="note" defaultValue={row.note} maxLength={200} required />
          </div>
          <div className="field">
            <label>금액(원)</label>
            <input
              type="number"
              name="amount"
              min="1"
              step="1"
              max="100000000"
              defaultValue={row.amount}
              required
            />
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

export default function ReimbursementTable({
  rows,
  emptyLabel,
  showDelete = true,
  canEdit = false,
}: {
  rows: Row[];
  emptyLabel: string;
  showDelete?: boolean;
  canEdit?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!rows.length) return <div className="empty-state">{emptyLabel}</div>;

  const total = rows.reduce((acc, r) => acc + r.amount, 0);
  const span = showDelete ? 4 : 3;

  return (
    <div className="table-wrap">
      <table className="ledger">
        <thead>
          <tr>
            <th className="num">날짜</th>
            <th>내용</th>
            <th className="num">금액</th>
            {showDelete ? <th>관리</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            canEdit && editingId === r.id ? (
              <EditRow key={r.id} row={r} span={span} onClose={() => setEditingId(null)} />
            ) : (
              <tr key={r.id}>
                <td className="num">{r.date}</td>
                <td>{r.note}</td>
                <td className="num">{won(r.amount)}</td>
                {showDelete ? (
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {canEdit ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setEditingId(r.id)}
                        >
                          수정
                        </button>
                      ) : null}
                      <form
                        action={deleteReimbursementAction}
                        onSubmit={(e) => {
                          if (!confirm("이 실비 항목을 삭제할까요?")) e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="btn btn-danger btn-sm">
                          삭제
                        </button>
                      </form>
                    </div>
                  </td>
                ) : null}
              </tr>
            ),
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>합계</td>
            <td className="num">{won(total)}</td>
            {showDelete ? <td></td> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

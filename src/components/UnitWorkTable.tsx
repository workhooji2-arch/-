"use client";

import { useActionState, useEffect, useState } from "react";
import { won } from "@/lib/payroll";
import {
  deleteUnitWorkAction,
  updateUnitWorkAction,
  type EditState,
} from "@/lib/unit-work-actions";

type Row = {
  id: string;
  date: string;
  label: string;
  taskId: string | null;
  quantity: number;
  rate: number;
  note: string | null;
};
type Task = { id: string; label: string; rate: number };

function EditRow({
  row,
  tasks,
  span,
  onClose,
}: {
  row: Row;
  tasks: Task[];
  span: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<EditState, FormData>(
    updateUnitWorkAction,
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
          {tasks.length ? (
            <div className="field grow">
              <label>업무</label>
              <select name="taskId" defaultValue={row.taskId ?? ""}>
                {row.taskId ? null : <option value="">{row.label} (삭제된 업무)</option>}
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({won(t.rate)}/개)
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="field">
            <label>개수</label>
            <input
              type="number"
              name="quantity"
              min="1"
              step="1"
              max="100000"
              defaultValue={row.quantity}
              required
            />
          </div>
          <div className="field grow">
            <label>비고</label>
            <input type="text" name="note" defaultValue={row.note ?? ""} maxLength={200} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
            {pending ? "저장 중…" : "저장"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            취소
          </button>
          {state && "error" in state ? <div className="error-msg">{state.error}</div> : null}
          <div className="hint" style={{ width: "100%", margin: "0.4rem 0 0" }}>
            업무를 그대로 두면 기록 당시 단가({won(row.rate)})가 유지되고, 다른 업무로 바꾸면 그 업무의 현재
            단가로 다시 계산됩니다.
          </div>
        </form>
      </td>
    </tr>
  );
}

export default function UnitWorkTable({
  rows,
  emptyLabel,
  showDelete = true,
  canEdit = false,
  tasks = [],
}: {
  rows: Row[];
  emptyLabel: string;
  showDelete?: boolean;
  canEdit?: boolean;
  tasks?: Task[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!rows.length) return <div className="empty-state">{emptyLabel}</div>;

  const totalQty = rows.reduce((acc, r) => acc + r.quantity, 0);
  const totalPay = rows.reduce((acc, r) => acc + r.quantity * r.rate, 0);
  const span = showDelete ? 7 : 6;

  return (
    <div className="table-wrap">
      <table className="ledger">
        <thead>
          <tr>
            <th className="num">날짜</th>
            <th>업무</th>
            <th className="num">개수</th>
            <th className="num">단가</th>
            <th className="num">금액</th>
            <th>비고</th>
            {showDelete ? <th>관리</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            canEdit && editingId === r.id ? (
              <EditRow
                key={r.id}
                row={r}
                tasks={tasks}
                span={span}
                onClose={() => setEditingId(null)}
              />
            ) : (
              <tr key={r.id}>
                <td className="num">{r.date}</td>
                <td>{r.label}</td>
                <td className="num">{r.quantity.toLocaleString("ko-KR")}개</td>
                <td className="num">{won(r.rate)}</td>
                <td className="num">{won(r.quantity * r.rate)}</td>
                <td>{r.note}</td>
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
                        action={deleteUnitWorkAction}
                        onSubmit={(e) => {
                          if (!confirm("이 작업 기록을 삭제할까요?")) e.preventDefault();
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
            <td className="num">{totalQty.toLocaleString("ko-KR")}개</td>
            <td></td>
            <td className="num">{won(totalPay)}</td>
            <td></td>
            {showDelete ? <td></td> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

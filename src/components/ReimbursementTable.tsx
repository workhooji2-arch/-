import { won } from "@/lib/payroll";
import { deleteReimbursementAction } from "@/lib/reimbursement-actions";
import DeleteButton from "./DeleteButton";

type Row = { id: string; date: string; note: string; amount: number };

export default function ReimbursementTable({
  rows,
  emptyLabel,
  showDelete = true,
}: {
  rows: Row[];
  emptyLabel: string;
  showDelete?: boolean;
}) {
  if (!rows.length) return <div className="empty-state">{emptyLabel}</div>;

  const total = rows.reduce((acc, r) => acc + r.amount, 0);

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
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="num">{r.date}</td>
              <td>{r.note}</td>
              <td className="num">{won(r.amount)}</td>
              {showDelete ? (
                <td>
                  <DeleteButton
                    action={deleteReimbursementAction}
                    id={r.id}
                    confirmText="이 실비 항목을 삭제할까요?"
                  />
                </td>
              ) : null}
            </tr>
          ))}
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

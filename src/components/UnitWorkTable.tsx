import { won } from "@/lib/payroll";
import { deleteUnitWorkAction } from "@/lib/unit-work-actions";
import DeleteButton from "./DeleteButton";

type Row = { id: string; date: string; quantity: number; rate: number; note: string | null };

export default function UnitWorkTable({
  rows,
  emptyLabel,
  showDelete = true,
}: {
  rows: Row[];
  emptyLabel: string;
  showDelete?: boolean;
}) {
  if (!rows.length) return <div className="empty-state">{emptyLabel}</div>;

  const totalQty = rows.reduce((acc, r) => acc + r.quantity, 0);
  const totalPay = rows.reduce((acc, r) => acc + r.quantity * r.rate, 0);

  return (
    <div className="table-wrap">
      <table className="ledger">
        <thead>
          <tr>
            <th className="num">날짜</th>
            <th className="num">개수</th>
            <th className="num">단가</th>
            <th className="num">금액</th>
            <th>내용</th>
            {showDelete ? <th>관리</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="num">{r.date}</td>
              <td className="num">{r.quantity.toLocaleString("ko-KR")}개</td>
              <td className="num">{won(r.rate)}</td>
              <td className="num">{won(r.quantity * r.rate)}</td>
              <td>{r.note}</td>
              {showDelete ? (
                <td>
                  <DeleteButton
                    action={deleteUnitWorkAction}
                    id={r.id}
                    confirmText="이 작업 기록을 삭제할까요?"
                  />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>합계</td>
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

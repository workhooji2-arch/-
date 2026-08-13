import { hrs, won } from "@/lib/payroll";

export default function PayslipTotals({
  totalHours,
  hourlyPay,
  unitPay,
  workPay,
  tax,
  netWork,
  expenses,
  total,
}: {
  totalHours: number;
  hourlyPay: number;
  unitPay: number;
  workPay: number;
  tax: number;
  netWork: number;
  expenses: number;
  total: number;
}) {
  // Only name the two kinds of pay separately when both are actually in play;
  // for the usual hourly-only TA that split would be noise.
  const splitPay = hourlyPay > 0 && unitPay > 0;

  return (
    <div className="payslip-total-row">
      {hourlyPay > 0 || !unitPay ? (
        <div className="block">
          <div className="label">총 근무시간</div>
          <div className="amount">{hrs(totalHours)}시간</div>
        </div>
      ) : null}
      {splitPay ? (
        <>
          <div className="block">
            <div className="label">시간 급여</div>
            <div className="amount">{won(hourlyPay)}</div>
          </div>
          <div className="block">
            <div className="label">개수 급여</div>
            <div className="amount">{won(unitPay)}</div>
          </div>
        </>
      ) : null}
      <div className="block">
        <div className="label">근무 급여</div>
        <div className="amount money">{won(workPay)}</div>
      </div>
      <div className="block">
        <div className="label">원천징수 (3.3%)</div>
        <div className="amount deduction">−{won(tax)}</div>
      </div>
      <div className="block">
        <div className="label">급여 실수령</div>
        <div className="amount">{won(netWork)}</div>
      </div>
      <div className="block">
        <div className="label">실비 정산 (비과세)</div>
        <div className="amount">+{won(expenses)}</div>
      </div>
      <div className="block net-block">
        <div className="label">최종 지급액</div>
        <div className="amount net">{won(total)}</div>
      </div>
    </div>
  );
}

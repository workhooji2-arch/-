import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTA } from "@/lib/session";
import {
  currentMonthKST,
  hrs,
  monthLabel,
  settle,
  sumHours,
  sumPay,
  sumUnitPay,
  todayKST,
  won,
} from "@/lib/payroll";
import LogoutButton from "@/components/LogoutButton";
import MonthFilter from "@/components/MonthFilter";
import DeleteButton from "@/components/DeleteButton";
import PrintButton from "@/components/PrintButton";
import PayslipTotals from "@/components/PayslipTotals";
import ReimbursementForm from "@/components/ReimbursementForm";
import ReimbursementTable from "@/components/ReimbursementTable";
import UnitWorkForm from "@/components/UnitWorkForm";
import UnitWorkTable from "@/components/UnitWorkTable";
import TimerBox from "./TimerBox";
import ManualEntryForm from "./ManualEntryForm";
import { clockInAction, clockOutAction, deleteSessionAction } from "./actions";
import { logoutAction } from "@/lib/actions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const user = await requireTA();
  const sp = await searchParams;
  const tab = sp.tab === "payslip" ? "payslip" : "log";
  const nowMonth = currentMonthKST();
  const month = sp.month || nowMonth;

  const [thisMonthSessions, viewSessions, viewExpenses, viewUnits] = await Promise.all([
    month === nowMonth
      ? Promise.resolve(null)
      : prisma.workSession.findMany({ where: { userId: user.id, date: { startsWith: nowMonth } } }),
    prisma.workSession.findMany({
      where: { userId: user.id, date: { startsWith: month } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.reimbursement.findMany({
      where: { userId: user.id, date: { startsWith: month } },
      orderBy: [{ date: "asc" }],
    }),
    prisma.unitWork.findMany({
      where: { userId: user.id, date: { startsWith: month } },
      orderBy: [{ date: "asc" }],
    }),
  ]);

  const headerSessions = thisMonthSessions ?? viewSessions;
  const headerHours = sumHours(headerSessions);
  // Piece work counts toward the headline figure as well, so a TA paid only by
  // the piece does not see a total of zero.
  const headerUnits =
    month === nowMonth
      ? viewUnits
      : await prisma.unitWork.findMany({ where: { userId: user.id, date: { startsWith: nowMonth } } });
  const headerPay = sumPay(headerSessions) + sumUnitPay(headerUnits);

  const totalHours = sumHours(viewSessions);
  const totals = settle(viewSessions, viewExpenses, viewUnits);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>조교 급여 대장</h1>
          <p>{user.name}님의 근무 기록과 급여를 확인하세요.</p>
        </div>
        <div className="who">
          <span className="role-pill">조교</span>
          {user.name} ({user.username})
          <Link href="/dashboard/account" className="btn btn-ghost btn-sm">
            계정 설정
          </Link>
          <LogoutButton action={logoutAction} />
        </div>
      </header>

      <div className="summary-grid">
        <div className="stat-card">
          <div className="label">이번 달 총 근무시간</div>
          <div className="value">{hrs(headerHours)}시간</div>
        </div>
        <div className="stat-card money">
          <div className="label">이번 달 총 지급액</div>
          <div className="value">{won(headerPay)}</div>
        </div>
        <div className="stat-card">
          <div className="label">{user.unitRate && !user.wage ? "개당 단가" : "시급"}</div>
          <div className="value">
            {user.unitRate && !user.wage
              ? won(user.unitRate)
              : user.wage
                ? won(user.wage)
                : "미설정"}
          </div>
        </div>
      </div>

      <nav className="tabs">
        <Link href={`/dashboard?tab=log&month=${month}`} className={`tab-btn${tab === "log" ? " active" : ""}`}>
          근무 기록
        </Link>
        <Link href={`/dashboard?tab=payslip&month=${month}`} className={`tab-btn${tab === "payslip" ? " active" : ""}`}>
          급여 명세서
        </Link>
      </nav>

      {!user.wage && !user.unitRate ? (
        <div className="panel">
          <div className="empty-state">
            아직 시급이나 개당 단가가 설정되지 않았습니다. 관리자가 설정하면 기록을 시작할 수 있습니다.
          </div>
        </div>
      ) : tab === "log" ? (
        <>
          {user.wage ? (
            <div className="panel">
              <h2>근무 기록</h2>
              <TimerBox
                clockedInAt={user.currentClockIn ? user.currentClockIn.toISOString() : null}
                clockInAction={clockInAction}
                clockOutAction={clockOutAction}
              />
              <ManualEntryForm today={todayKST()} />
            </div>
          ) : null}
          {user.unitRate ? (
            <div className="panel">
              <h2>개수 작업</h2>
              <UnitWorkForm today={todayKST()} rate={user.unitRate} />
              <div style={{ marginTop: "1.25rem" }}>
                <UnitWorkTable
                  rows={viewUnits}
                  emptyLabel={`${monthLabel(month)}에 등록된 개수 작업이 없습니다.`}
                />
              </div>
            </div>
          ) : null}
          <div className="panel">
            <div className="toolbar">
              <h3 style={{ margin: 0 }}>
                {monthLabel(month)} {user.wage ? "근무 내역" : "조회 월"}
              </h3>
              <MonthFilter month={month} hidden={{ tab: "log" }} />
            </div>
            {!user.wage ? (
              <div className="empty-state">
                시간제 근무는 하지 않는 조교입니다. 위 개수 작업 기록을 사용하세요.
              </div>
            ) : viewSessions.length ? (
              <div className="table-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th className="num">날짜</th>
                      <th className="num">출근</th>
                      <th className="num">퇴근</th>
                      <th className="num">시간</th>
                      <th>비고</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewSessions.map((s) => (
                      <tr key={s.id}>
                        <td className="num">{s.date}</td>
                        <td className="num">{s.startTime}</td>
                        <td className="num">{s.endTime}</td>
                        <td className="num">{hrs(s.hours)}</td>
                        <td>{s.note}</td>
                        <td>
                          <DeleteButton action={deleteSessionAction} id={s.id} confirmText="이 근무 기록을 삭제할까요?" />
                        </td>
                      </tr>
                    ))}
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
            ) : (
              <div className="empty-state">{monthLabel(month)}에 기록된 근무가 없습니다.</div>
            )}
          </div>
          <div className="panel">
            <h3>실비 정산 (비품비 · 심부름 결제)</h3>
            <div className="hint">
              직접 결제한 금액을 올리면 급여와 별도로, 세금 없이 전액 그대로 지급됩니다.
            </div>
            <ReimbursementForm today={todayKST()} />
            <div style={{ marginTop: "1.25rem" }}>
              <ReimbursementTable
                rows={viewExpenses}
                emptyLabel={`${monthLabel(month)}에 등록된 실비가 없습니다.`}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="panel">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>급여 명세서</h2>
            <div className="field-row">
              <MonthFilter month={month} hidden={{ tab: "payslip" }} />
              <a className="btn btn-ghost" href={`/api/export/detail?month=${month}`}>
                엑셀 내려받기
              </a>
              <PrintButton />
            </div>
          </div>
          <div className="payslip-card" id="payslip-print-area">
            <div className="payslip-head">
              <div className="name">{user.name}</div>
              <div className="period">
                {monthLabel(month)} 급여 명세서
                {user.wage ? ` · 시급 ${won(user.wage)}` : ""}
                {user.unitRate ? ` · 개당 ${won(user.unitRate)}` : ""}
              </div>
            </div>
            {viewSessions.length ? (
              <div className="table-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th className="num">날짜</th>
                      <th className="num">근무 시간대</th>
                      <th className="num">시간</th>
                      <th className="num">시급</th>
                      <th className="num">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewSessions.map((s) => (
                      <tr key={s.id}>
                        <td className="num">{s.date}</td>
                        <td className="num">
                          {s.startTime}–{s.endTime}
                        </td>
                        <td className="num">{hrs(s.hours)}</td>
                        <td className="num">{won(s.wage)}</td>
                        <td className="num">{won(s.hours * s.wage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : user.wage ? (
              <div className="empty-state">{monthLabel(month)}에 기록된 근무가 없습니다.</div>
            ) : null}
            {viewUnits.length ? (
              <div style={{ marginTop: "1.5rem" }}>
                <h3>개수 작업</h3>
                <UnitWorkTable rows={viewUnits} emptyLabel="" showDelete={false} />
              </div>
            ) : null}
            {viewExpenses.length ? (
              <div style={{ marginTop: "1.5rem" }}>
                <h3>실비 정산 (비과세)</h3>
                <ReimbursementTable rows={viewExpenses} emptyLabel="" showDelete={false} />
              </div>
            ) : null}
            <PayslipTotals totalHours={totalHours} {...totals} />
          </div>
        </div>
      )}
    </div>
  );
}

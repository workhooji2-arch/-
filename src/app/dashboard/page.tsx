import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireTA } from "@/lib/session";
import {
  TAX_RATE,
  currentMonthKST,
  hrs,
  monthLabel,
  sumHours,
  sumPay,
  todayKST,
  won,
} from "@/lib/payroll";
import LogoutButton from "@/components/LogoutButton";
import MonthFilter from "@/components/MonthFilter";
import DeleteButton from "@/components/DeleteButton";
import PrintButton from "@/components/PrintButton";
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

  const [thisMonthSessions, viewSessions] = await Promise.all([
    month === nowMonth
      ? Promise.resolve(null)
      : prisma.workSession.findMany({ where: { userId: user.id, date: { startsWith: nowMonth } } }),
    prisma.workSession.findMany({
      where: { userId: user.id, date: { startsWith: month } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const headerSessions = thisMonthSessions ?? viewSessions;
  const headerHours = sumHours(headerSessions);
  const headerPay = sumPay(headerSessions);

  const totalHours = sumHours(viewSessions);
  const totalPay = sumPay(viewSessions);
  const taxAmount = Math.round(totalPay * TAX_RATE);
  const netPay = totalPay - taxAmount;

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
          <div className="label">시급</div>
          <div className="value">{user.wage ? won(user.wage) : "미설정"}</div>
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

      {!user.wage ? (
        <div className="panel">
          <div className="empty-state">
            아직 시급이 설정되지 않았습니다. 관리자가 시급을 설정하면 근무 기록을 시작할 수 있습니다.
          </div>
        </div>
      ) : tab === "log" ? (
        <>
          <div className="panel">
            <h2>근무 기록</h2>
            <TimerBox
              clockedInAt={user.currentClockIn ? user.currentClockIn.toISOString() : null}
              clockInAction={clockInAction}
              clockOutAction={clockOutAction}
            />
            <ManualEntryForm today={todayKST()} />
          </div>
          <div className="panel">
            <div className="toolbar">
              <h3 style={{ margin: 0 }}>{monthLabel(month)} 근무 내역</h3>
              <MonthFilter month={month} hidden={{ tab: "log" }} />
            </div>
            {viewSessions.length ? (
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
        </>
      ) : (
        <div className="panel">
          <div className="toolbar">
            <h2 style={{ margin: 0 }}>급여 명세서</h2>
            <div className="field-row">
              <MonthFilter month={month} hidden={{ tab: "payslip" }} />
              <PrintButton />
            </div>
          </div>
          <div className="payslip-card" id="payslip-print-area">
            <div className="payslip-head">
              <div className="name">{user.name}</div>
              <div className="period">
                {monthLabel(month)} 급여 명세서 · 시급 {won(user.wage)}
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
            ) : (
              <div className="empty-state">{monthLabel(month)}에 기록된 근무가 없습니다.</div>
            )}
            <div className="payslip-total-row">
              <div className="block">
                <div className="label">총 근무시간</div>
                <div className="amount">{hrs(totalHours)}시간</div>
              </div>
              <div className="block">
                <div className="label">총 지급액</div>
                <div className="amount money">{won(totalPay)}</div>
              </div>
              <div className="block">
                <div className="label">원천징수 (3.3%)</div>
                <div className="amount deduction">−{won(taxAmount)}</div>
              </div>
              <div className="block net-block">
                <div className="label">실수령액</div>
                <div className="amount net">{won(netPay)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
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
import { logoutAction } from "@/lib/actions";
import WageForm from "./WageForm";
import AdminSessionForm from "./AdminSessionForm";
import { deleteTaAction, deleteSessionAdminAction } from "./actions";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; ta?: string; month?: string }>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "log" || sp.tab === "payslip" ? sp.tab : "tas";
  const month = sp.month || currentMonthKST();

  const tas = await prisma.user.findMany({
    where: { role: "TA" },
    orderBy: { createdAt: "asc" },
  });

  const nowMonth = currentMonthKST();
  const monthSessionsAll = await prisma.workSession.findMany({ where: { date: { startsWith: nowMonth } } });
  const headerHours = sumHours(monthSessionsAll);
  const headerPay = sumPay(monthSessionsAll);

  const selectedTaId = sp.ta && tas.some((t) => t.id === sp.ta) ? sp.ta : tas[0]?.id ?? null;
  const selectedTa = selectedTaId ? tas.find((t) => t.id === selectedTaId) ?? null : null;

  const viewSessions = selectedTaId
    ? await prisma.workSession.findMany({
        where: { userId: selectedTaId, date: { startsWith: month } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      })
    : [];

  const totalHours = sumHours(viewSessions);
  const totalPay = sumPay(viewSessions);
  const taxAmount = Math.round(totalPay * TAX_RATE);
  const netPay = totalPay - taxAmount;

  let summaryRows: { id: string; name: string; hours: number; pay: number; tax: number; net: number }[] = [];
  if (tab === "payslip") {
    const allMonthSessions = await prisma.workSession.findMany({ where: { date: { startsWith: month } } });
    summaryRows = tas.map((t) => {
      const s = allMonthSessions.filter((sess) => sess.userId === t.id);
      const pay = sumPay(s);
      const tax = Math.round(pay * TAX_RATE);
      return { id: t.id, name: t.name, hours: sumHours(s), pay, tax, net: pay - tax };
    });
  }
  const grandHours = summaryRows.reduce((a, r) => a + r.hours, 0);
  const grandPay = summaryRows.reduce((a, r) => a + r.pay, 0);
  const grandTax = summaryRows.reduce((a, r) => a + r.tax, 0);
  const grandNet = summaryRows.reduce((a, r) => a + r.net, 0);

  const tabHref = (t: string) => `/admin?tab=${t}${selectedTaId ? `&ta=${selectedTaId}` : ""}&month=${month}`;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>조교 급여 대장</h1>
          <p>모든 조교의 근무 기록과 급여를 관리합니다.</p>
        </div>
        <div className="who">
          <span className="role-pill">관리자</span>
          {admin.name} ({admin.username})
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
          <div className="label">등록된 조교</div>
          <div className="value">{tas.length}명</div>
        </div>
      </div>

      <nav className="tabs">
        <Link href={tabHref("tas")} className={`tab-btn${tab === "tas" ? " active" : ""}`}>
          조교 관리
        </Link>
        <Link href={tabHref("log")} className={`tab-btn${tab === "log" ? " active" : ""}`}>
          근무 기록
        </Link>
        <Link href={tabHref("payslip")} className={`tab-btn${tab === "payslip" ? " active" : ""}`}>
          급여 명세서
        </Link>
      </nav>

      {tab === "tas" && (
        <div className="panel">
          <h2>조교 관리</h2>
          <div className="hint">
            조교가 직접 가입하면 이 목록에 나타납니다. 시급을 설정해야 해당 조교가 근무를 기록할 수 있습니다. 시급을
            수정해도 이미 기록된 근무 건의 금액은 바뀌지 않습니다.
          </div>
          {tas.length ? (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>아이디</th>
                    <th className="num">시급</th>
                    <th>비고</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {tas.map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{t.username}</td>
                      <td className="num">{t.wage ? won(t.wage) + " / 시간" : "미설정"}</td>
                      <td>{t.memo}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <WageForm userId={t.id} currentWage={t.wage} currentMemo={t.memo} />
                            <DeleteButton
                              action={deleteTaAction}
                              id={t.id}
                              label="삭제"
                              confirmText={`${t.name} 조교를 삭제하면 근무 기록도 함께 삭제됩니다. 계속할까요?`}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">아직 가입한 조교가 없습니다. 조교에게 가입 링크를 공유해주세요.</div>
          )}
        </div>
      )}

      {tab === "log" && (
        <>
          <div className="panel">
            <h2>근무 기록</h2>
            {tas.length ? (
              <>
                <div className="ta-picker">
                  {tas.map((t) => (
                    <Link
                      key={t.id}
                      href={`/admin?tab=log&ta=${t.id}&month=${month}`}
                      className={`ta-chip${t.id === selectedTaId ? " active" : ""}`}
                    >
                      {t.name}
                    </Link>
                  ))}
                </div>
                {selectedTa && selectedTa.wage ? (
                  <AdminSessionForm userId={selectedTa.id} today={todayKST()} />
                ) : (
                  <div className="empty-state">이 조교는 시급이 설정되지 않아 근무를 기록할 수 없습니다.</div>
                )}
              </>
            ) : (
              <div className="empty-state">아직 가입한 조교가 없습니다.</div>
            )}
          </div>
          {selectedTa && (
            <div className="panel">
              <div className="toolbar">
                <h3 style={{ margin: 0 }}>
                  {selectedTa.name}님의 {monthLabel(month)} 근무 내역
                </h3>
                <MonthFilter month={month} hidden={{ tab: "log", ta: selectedTa.id }} />
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
                            <DeleteButton action={deleteSessionAdminAction} id={s.id} confirmText="이 근무 기록을 삭제할까요?" />
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
          )}
        </>
      )}

      {tab === "payslip" && (
        <>
          <div className="panel">
            <div className="toolbar">
              <h2 style={{ margin: 0 }}>급여 명세서</h2>
              <div className="field-row">
                <MonthFilter month={month} hidden={{ tab: "payslip", ta: selectedTaId ?? "" }} />
                {selectedTa ? <PrintButton /> : null}
              </div>
            </div>
            {tas.length ? (
              <div className="ta-picker">
                {tas.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin?tab=payslip&ta=${t.id}&month=${month}`}
                    className={`ta-chip${t.id === selectedTaId ? " active" : ""}`}
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            ) : null}
            {selectedTa ? (
              <div className="payslip-card" id="payslip-print-area">
                <div className="payslip-head">
                  <div className="name">{selectedTa.name}</div>
                  <div className="period">
                    {monthLabel(month)} 급여 명세서 · 시급 {selectedTa.wage ? won(selectedTa.wage) : "미설정"}
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
            ) : (
              <div className="empty-state">아직 가입한 조교가 없습니다.</div>
            )}
          </div>
          <div className="panel">
            <h3>{monthLabel(month)} 전체 조교 요약</h3>
            {summaryRows.length ? (
              <div className="table-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th className="num">총 근무시간</th>
                      <th className="num">총 지급액</th>
                      <th className="num">원천징수 (3.3%)</th>
                      <th className="num">실수령액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td className="num">{hrs(r.hours)}</td>
                        <td className="num">{won(r.pay)}</td>
                        <td className="num">−{won(r.tax)}</td>
                        <td className="num">{won(r.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>전체 합계</td>
                      <td className="num">{hrs(grandHours)}</td>
                      <td className="num">{won(grandPay)}</td>
                      <td className="num">−{won(grandTax)}</td>
                      <td className="num">{won(grandNet)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="empty-state">등록된 조교가 없습니다.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

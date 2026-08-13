import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
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
import { logoutAction } from "@/lib/actions";
import WageForm from "./WageForm";
import ResetPasswordForm from "./ResetPasswordForm";
import AdminSessionForm from "./AdminSessionForm";
import BudgetForm from "./BudgetPanel";
import UnitTaskManager from "./UnitTaskManager";
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

  const [tas, allTasks] = await Promise.all([
    prisma.user.findMany({ where: { role: "TA" }, orderBy: { createdAt: "asc" } }),
    prisma.unitTask.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const tasksFor = (userId: string) => allTasks.filter((t) => t.userId === userId);

  const nowMonth = currentMonthKST();
  const [monthSessionsAll, monthUnitsAll] = await Promise.all([
    prisma.workSession.findMany({ where: { date: { startsWith: nowMonth } } }),
    prisma.unitWork.findMany({ where: { date: { startsWith: nowMonth } } }),
  ]);
  const headerHours = sumHours(monthSessionsAll);
  // Piece work is pay too, so the headline figure has to include it.
  const headerPay = sumPay(monthSessionsAll) + sumUnitPay(monthUnitsAll);

  const selectedTaId = sp.ta && tas.some((t) => t.id === sp.ta) ? sp.ta : tas[0]?.id ?? null;
  const selectedTa = selectedTaId ? tas.find((t) => t.id === selectedTaId) ?? null : null;

  const [viewSessions, viewExpenses, viewUnits] = selectedTaId
    ? await Promise.all([
        prisma.workSession.findMany({
          where: { userId: selectedTaId, date: { startsWith: month } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        }),
        prisma.reimbursement.findMany({
          where: { userId: selectedTaId, date: { startsWith: month } },
          orderBy: [{ date: "asc" }],
        }),
        prisma.unitWork.findMany({
          where: { userId: selectedTaId, date: { startsWith: month } },
          orderBy: [{ date: "asc" }],
        }),
      ])
    : [[], [], []];

  const totalHours = sumHours(viewSessions);
  const totals = settle(viewSessions, viewExpenses, viewUnits);

  type SummaryRow = {
    id: string;
    name: string;
    hours: number;
    hourlyPay: number;
    unitPay: number;
    workPay: number;
    tax: number;
    netWork: number;
    expenses: number;
    total: number;
  };
  let summaryRows: SummaryRow[] = [];
  let budget = 0;
  if (tab === "payslip") {
    const [allSessions, allExpenses, allUnits, setting] = await Promise.all([
      prisma.workSession.findMany({ where: { date: { startsWith: month } } }),
      prisma.reimbursement.findMany({ where: { date: { startsWith: month } } }),
      prisma.unitWork.findMany({ where: { date: { startsWith: month } } }),
      prisma.setting.findUnique({ where: { id: "singleton" } }),
    ]);
    budget = setting?.monthlyBudget ?? 0;
    summaryRows = tas.map((t) => {
      const s = allSessions.filter((sess) => sess.userId === t.id);
      const e = allExpenses.filter((exp) => exp.userId === t.id);
      const u = allUnits.filter((unit) => unit.userId === t.id);
      return { id: t.id, name: t.name, hours: sumHours(s), ...settle(s, e, u) };
    });
  }
  const grand = (pick: (r: SummaryRow) => number) => summaryRows.reduce((a, r) => a + pick(r), 0);

  // What actually leaves the budget is the pay before withholding plus the
  // reimbursements — the 3.3% is money passed on to the tax office, not saved.
  const payrollCost = grand((r) => r.workPay) + grand((r) => r.expenses);
  const remaining = budget - payrollCost;

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
            조교가 직접 가입하면 이 목록에 나타납니다. 시간제로 일하면 시급을, 개수제로 일하면 아래에서 업무별
            단가를 등록해주세요. 둘 다 있으면 두 급여를 합산해 받습니다. 단가를 바꿔도 이미 기록된 건의 금액은
            그대로입니다.
          </div>
          {tas.length ? (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>아이디</th>
                    <th className="num">시급</th>
                    <th className="num">개수 업무</th>
                    <th>비고</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {tas.map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{t.username}</td>
                      <td className="num">{t.wage ? won(t.wage) + " / 시간" : "—"}</td>
                      <td className="num">
                        {tasksFor(t.id).length ? `${tasksFor(t.id).length}종` : "—"}
                      </td>
                      <td>{t.memo}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <WageForm userId={t.id} currentWage={t.wage} currentMemo={t.memo} />
                            <ResetPasswordForm userId={t.id} name={t.name} />
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

      {tab === "tas" &&
        tas.map((t) => (
          <div className="panel" key={`tasks-${t.id}`}>
            <h3>{t.name}님의 개수 업무 단가</h3>
            <div className="hint">
              업무마다 단가가 다르면 여러 개를 등록하세요. 조교는 기록할 때 업무를 골라 개수만 입력합니다.
            </div>
            <UnitTaskManager userId={t.id} tasks={tasksFor(t.id)} />
          </div>
        ))}

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
                ) : null}
                {selectedTa && !selectedTa.wage && !tasksFor(selectedTa.id).length ? (
                  <div className="empty-state">
                    이 조교는 시급도 개수 업무도 설정되지 않아 기록을 남길 수 없습니다. 조교 관리 탭에서
                    먼저 설정해주세요.
                  </div>
                ) : null}
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
          {selectedTa && tasksFor(selectedTa.id).length ? (
            <div className="panel">
              <h3>{selectedTa.name}님의 개수 작업</h3>
              <UnitWorkForm today={todayKST()} tasks={tasksFor(selectedTa.id)} userId={selectedTa.id} />
              <div style={{ marginTop: "1.25rem" }}>
                <UnitWorkTable
                  rows={viewUnits}
                  emptyLabel={`${monthLabel(month)}에 등록된 개수 작업이 없습니다.`}
                />
              </div>
            </div>
          ) : null}
          {selectedTa && (
            <div className="panel">
              <h3>{selectedTa.name}님의 실비 정산 (비품비 · 심부름 결제)</h3>
              <div className="hint">급여와 별도로, 원천징수 없이 전액 지급되는 항목입니다.</div>
              <ReimbursementForm today={todayKST()} userId={selectedTa.id} />
              <div style={{ marginTop: "1.25rem" }}>
                <ReimbursementTable
                  rows={viewExpenses}
                  emptyLabel={`${monthLabel(month)}에 등록된 실비가 없습니다.`}
                />
              </div>
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
                {selectedTa ? (
                  <a className="btn btn-ghost" href={`/api/export/detail?ta=${selectedTa.id}&month=${month}`}>
                    이 조교 엑셀
                  </a>
                ) : null}
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
            ) : (
              <div className="empty-state">아직 가입한 조교가 없습니다.</div>
            )}
          </div>
          <div className="panel">
            <div className="toolbar">
              <h3 style={{ margin: 0 }}>{monthLabel(month)} 예산 잔액</h3>
              <BudgetForm currentBudget={budget} />
            </div>
            {budget > 0 ? (
              <>
                <div className="summary-grid">
                  <div className="stat-card">
                    <div className="label">내 월급 (예산)</div>
                    <div className="value">{won(budget)}</div>
                  </div>
                  <div className="stat-card money">
                    <div className="label">조교 인건비 + 실비</div>
                    <div className="value">−{won(payrollCost)}</div>
                  </div>
                  <div className={`stat-card${remaining < 0 ? " over" : " left"}`}>
                    <div className="label">{remaining < 0 ? "예산 초과" : "남는 금액"}</div>
                    <div className="value">{won(remaining)}</div>
                  </div>
                </div>
                <div className="hint" style={{ margin: "0.75rem 0 0" }}>
                  인건비는 원천징수를 떼기 전 금액입니다. 3.3%는 조교가 아니라 세무서로 갈 뿐, 예산에서는 똑같이
                  나가기 때문입니다.
                </div>
              </>
            ) : (
              <div className="empty-state">
                내 월급(월 예산)을 설정하면 조교 인건비를 빼고 얼마가 남는지 보여드립니다.
              </div>
            )}
          </div>
          <div className="panel">
            <div className="toolbar">
              <h3 style={{ margin: 0 }}>{monthLabel(month)} 전체 조교 요약</h3>
              <a className="btn btn-primary" href={`/api/export/summary?month=${month}`}>
                전체 요약 엑셀 내려받기
              </a>
            </div>
            {summaryRows.length ? (
              <div className="table-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th className="num">근무시간</th>
                      <th className="num">개수 급여</th>
                      <th className="num">근무 급여</th>
                      <th className="num">원천징수 (3.3%)</th>
                      <th className="num">급여 실수령</th>
                      <th className="num">실비 정산</th>
                      <th className="num">최종 지급액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td className="num">{hrs(r.hours)}</td>
                        <td className="num">{r.unitPay ? won(r.unitPay) : "—"}</td>
                        <td className="num">{won(r.workPay)}</td>
                        <td className="num">−{won(r.tax)}</td>
                        <td className="num">{won(r.netWork)}</td>
                        <td className="num">{won(r.expenses)}</td>
                        <td className="num">{won(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>전체 합계</td>
                      <td className="num">{hrs(grand((r) => r.hours))}</td>
                      <td className="num">{won(grand((r) => r.unitPay))}</td>
                      <td className="num">{won(grand((r) => r.workPay))}</td>
                      <td className="num">−{won(grand((r) => r.tax))}</td>
                      <td className="num">{won(grand((r) => r.netWork))}</td>
                      <td className="num">{won(grand((r) => r.expenses))}</td>
                      <td className="num">{won(grand((r) => r.total))}</td>
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

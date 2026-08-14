import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { csvResponse } from "@/lib/csv";
import { currentMonthKST, monthLabel, settle } from "@/lib/payroll";

export async function GET(request: NextRequest) {
  const viewer = await getCurrentUser();
  if (!viewer) return new Response("로그인이 필요합니다.", { status: 401 });

  const requested = request.nextUrl.searchParams.get("ta") || "";
  // A TA can only ever export their own ledger, whatever the query string says.
  const targetId = viewer.role === "ADMIN" ? requested || viewer.id : viewer.id;
  const month = request.nextUrl.searchParams.get("month") || currentMonthKST();

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return new Response("대상을 찾을 수 없습니다.", { status: 404 });

  const [sessions, reimbursements, units] = await Promise.all([
    prisma.workSession.findMany({
      where: { userId: targetId, date: { startsWith: month } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.reimbursement.findMany({
      where: { userId: targetId, date: { startsWith: month } },
      orderBy: [{ date: "asc" }],
    }),
    prisma.unitWork.findMany({
      where: { userId: targetId, date: { startsWith: month } },
      orderBy: [{ date: "asc" }],
    }),
  ]);

  const { hourlyPay, unitPay, workPay, tax, netWork, expenses, total } = settle(
    sessions,
    reimbursements,
    units,
  );
  const totalHours = sessions.reduce((a, s) => a + s.hours, 0);
  const totalQty = units.reduce((a, u) => a + u.quantity, 0);

  const rows: (string | number)[][] = [
    [`${target.name} — ${monthLabel(month)} 급여 내역`],
    [],
    ["근무 기록"],
    ["날짜", "출근", "퇴근", "시간", "시급", "금액", "업무 내용"],
    ...sessions.map((s) => [
      s.date,
      s.startTime,
      s.endTime,
      s.hours,
      s.wage,
      Math.round(s.hours * s.wage),
      s.note ?? "",
    ]),
    ["", "", "", totalHours, "", hourlyPay, ""],
    [],
    ["개수 작업"],
    ["날짜", "업무", "개수", "단가", "금액", "비고"],
    ...units.map((u) => [u.date, u.label, u.quantity, u.rate, u.quantity * u.rate, u.note ?? ""]),
    ["", "", totalQty, "", unitPay, ""],
    [],
    ["실비 정산 (비과세)"],
    ["날짜", "내용", "금액"],
    ...reimbursements.map((r) => [r.date, r.note, r.amount]),
    ["", "합계", expenses],
    [],
    ["정산 요약"],
    ["시간 급여", hourlyPay],
    ["개수 급여", unitPay],
    ["근무 급여", workPay],
    ["원천징수 (3.3%)", -tax],
    ["급여 실수령", netWork],
    ["실비 정산", expenses],
    ["최종 지급액", total],
  ];

  return csvResponse(`${target.name}_${month}_급여내역.csv`, rows);
}

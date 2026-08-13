import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { csvResponse } from "@/lib/csv";
import { currentMonthKST, monthLabel, settle, sumHours } from "@/lib/payroll";

export async function GET(request: NextRequest) {
  const viewer = await getCurrentUser();
  if (!viewer) return new Response("로그인이 필요합니다.", { status: 401 });
  if (viewer.role !== "ADMIN") {
    return new Response("관리자만 내려받을 수 있습니다.", { status: 403 });
  }

  const month = request.nextUrl.searchParams.get("month") || currentMonthKST();

  const [tas, sessions, reimbursements, units, setting] = await Promise.all([
    prisma.user.findMany({ where: { role: "TA" }, orderBy: { createdAt: "asc" } }),
    prisma.workSession.findMany({ where: { date: { startsWith: month } } }),
    prisma.reimbursement.findMany({ where: { date: { startsWith: month } } }),
    prisma.unitWork.findMany({ where: { date: { startsWith: month } } }),
    prisma.setting.findUnique({ where: { id: "singleton" } }),
  ]);

  const perTa = tas.map((ta) => {
    const mine = sessions.filter((s) => s.userId === ta.id);
    const spent = reimbursements.filter((r) => r.userId === ta.id);
    const made = units.filter((u) => u.userId === ta.id);
    return { ta, hours: sumHours(mine), ...settle(mine, spent, made) };
  });

  const sum = (pick: (r: (typeof perTa)[number]) => number) =>
    perTa.reduce((acc, r) => acc + pick(r), 0);

  const rows: (string | number)[][] = [
    [`${monthLabel(month)} 조교 급여 요약`],
    [],
    [
      "이름",
      "아이디",
      "시급",
      "개당 단가",
      "근무시간",
      "시간 급여",
      "개수 급여",
      "근무 급여",
      "원천징수(3.3%)",
      "급여 실수령",
      "실비 정산",
      "최종 지급액",
    ],
    ...perTa.map((r) => [
      r.ta.name,
      r.ta.username,
      r.ta.wage ?? "",
      r.ta.unitRate ?? "",
      r.hours,
      r.hourlyPay,
      r.unitPay,
      r.workPay,
      -r.tax,
      r.netWork,
      r.expenses,
      r.total,
    ]),
    [
      "전체 합계",
      "",
      "",
      "",
      sum((r) => r.hours),
      sum((r) => r.hourlyPay),
      sum((r) => r.unitPay),
      sum((r) => r.workPay),
      -sum((r) => r.tax),
      sum((r) => r.netWork),
      sum((r) => r.expenses),
      sum((r) => r.total),
    ],
  ];

  const budget = setting?.monthlyBudget ?? 0;
  if (budget > 0) {
    const payrollCost = sum((r) => r.workPay) + sum((r) => r.expenses);
    rows.push(
      [],
      ["예산"],
      ["내 월급 (예산)", budget],
      ["조교 인건비 + 실비", -payrollCost],
      ["남는 금액", budget - payrollCost],
    );
  }

  return csvResponse(`${month}_조교급여요약.csv`, rows);
}

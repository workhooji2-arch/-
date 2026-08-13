export const TAX_RATE = 0.033;

export function won(n: number) {
  return Math.round(n).toLocaleString("ko-KR") + "원";
}

export function hrs(n: number) {
  return (Math.round(n * 100) / 100).toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return `${y}년 ${parseInt(mo, 10)}월`;
}

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function monthOf(dateStr: string) {
  return dateStr.slice(0, 7);
}

// The app targets Korean users; the server (Vercel) runs in UTC, so all
// date/time strings shown to users are computed in KST (UTC+9) explicitly.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function kstParts(date: Date) {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const iso = kst.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function todayKST() {
  return kstParts(new Date()).date;
}

export function currentMonthKST() {
  return todayKST().slice(0, 7);
}

export function sumHours(sessions: { hours: number }[]) {
  return sessions.reduce((acc, s) => acc + s.hours, 0);
}

export function sumPay(sessions: { hours: number; wage: number }[]) {
  return sessions.reduce((acc, s) => acc + s.hours * s.wage, 0);
}

export function sumAmount(items: { amount: number }[]) {
  return items.reduce((acc, i) => acc + i.amount, 0);
}

export function sumUnits(units: { quantity: number }[]) {
  return units.reduce((acc, u) => acc + u.quantity, 0);
}

export function sumUnitPay(units: { quantity: number; rate: number }[]) {
  return units.reduce((acc, u) => acc + u.quantity * u.rate, 0);
}

/**
 * Hourly pay and piece-rate pay are both earnings, so they are added together
 * before withholding. Reimbursements are the TA being paid back for money they
 * already spent, not income, so they are added after the deduction and paid in
 * full.
 */
export function settle(
  sessions: { hours: number; wage: number }[],
  reimbursements: { amount: number }[],
  units: { quantity: number; rate: number }[] = [],
) {
  const hourlyPay = sumPay(sessions);
  const unitPay = sumUnitPay(units);
  const workPay = hourlyPay + unitPay;
  const tax = Math.round(workPay * TAX_RATE);
  const netWork = workPay - tax;
  const expenses = sumAmount(reimbursements);
  return { hourlyPay, unitPay, workPay, tax, netWork, expenses, total: netWork + expenses };
}

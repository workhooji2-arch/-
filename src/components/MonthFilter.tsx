"use client";

export default function MonthFilter({
  month,
  hidden = {},
}: {
  month: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form method="get" className="field">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor="month-filter">조회 월</label>
      <input
        id="month-filter"
        type="month"
        name="month"
        defaultValue={month}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      />
    </form>
  );
}

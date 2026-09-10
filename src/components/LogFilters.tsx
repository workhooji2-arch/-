"use client";

/**
 * Month and task are chosen together in one GET form so that changing either
 * keeps the other, and the page stays a plain server render driven by the URL.
 */
export default function LogFilters({
  month,
  task,
  taskOptions,
  taskFieldName = "task",
  hidden = {},
}: {
  month: string;
  task: string;
  taskOptions: string[];
  taskFieldName?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form method="get" className="field-row">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="field">
        <label htmlFor="month-filter">조회 월</label>
        <input
          id="month-filter"
          type="month"
          name="month"
          defaultValue={month}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
      </div>
      {taskOptions.length ? (
        <div className="field">
          <label htmlFor={`${taskFieldName}-filter`}>업무</label>
          <select
            id={`${taskFieldName}-filter`}
            name={taskFieldName}
            defaultValue={task}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <option value="">전체 업무</option>
            {taskOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </form>
  );
}

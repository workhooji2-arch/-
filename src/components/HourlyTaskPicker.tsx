"use client";

import { won } from "@/lib/payroll";

export type HourlyTask = { id: string; label: string; rate: number };

/** The task decides the rate, so every hourly entry starts with this choice. */
export default function HourlyTaskPicker({
  id,
  tasks,
  defaultValue,
}: {
  id: string;
  tasks: HourlyTask[];
  defaultValue?: string;
}) {
  return (
    <div className="field grow">
      <label htmlFor={id}>업무</label>
      <select id={id} name="taskId" defaultValue={defaultValue ?? tasks[0]?.id ?? ""} required>
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label} ({won(t.rate)}/시간)
          </option>
        ))}
      </select>
    </div>
  );
}

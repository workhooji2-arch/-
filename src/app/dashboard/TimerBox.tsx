"use client";

import { useEffect, useState } from "react";
import { won } from "@/lib/payroll";
import type { HourlyTask } from "@/components/HourlyTaskPicker";

function formatElapsed(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function TimerBox({
  clockedInAt,
  currentTaskLabel,
  tasks,
  clockInAction,
  clockOutAction,
}: {
  clockedInAt: string | null;
  currentTaskLabel: string | null;
  tasks: HourlyTask[];
  clockInAction: (formData: FormData) => Promise<void>;
  clockOutAction: () => Promise<void>;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!clockedInAt) return;
    const startMs = new Date(clockedInAt).getTime();
    const tick = () => setElapsed(Date.now() - startMs);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockedInAt]);

  if (clockedInAt) {
    return (
      <div className="timer-box">
        <div>
          <div className="status-pill">
            <span className="dot" />
            {currentTaskLabel ? `${currentTaskLabel} 근무 중` : "근무 중"}
          </div>
          <div className="elapsed">{formatElapsed(elapsed)}</div>
        </div>
        <form action={clockOutAction}>
          <button type="submit" className="btn btn-danger">
            퇴근하기
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={clockInAction} className="timer-box">
      <div className="idle-label">현재 근무 중이 아닙니다.</div>
      <div className="field-row" style={{ alignItems: "flex-end" }}>
        <div className="field grow">
          <label htmlFor="clock-task">시작할 업무</label>
          <select id="clock-task" name="taskId" defaultValue={tasks[0]?.id ?? ""} required>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({won(t.rate)}/시간)
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          출근하기
        </button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";

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
  clockInAction,
  clockOutAction,
}: {
  clockedInAt: string | null;
  clockInAction: () => Promise<void>;
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
            근무 중
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
    <div className="timer-box">
      <div className="idle-label">현재 근무 중이 아닙니다.</div>
      <form action={clockInAction}>
        <button type="submit" className="btn btn-primary">
          출근하기
        </button>
      </form>
    </div>
  );
}

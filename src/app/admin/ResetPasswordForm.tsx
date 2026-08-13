"use client";

import { useActionState, useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";
import { resetTaPasswordAction, type ResetState } from "./actions";

export default function ResetPasswordForm({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    resetTaPasswordAction,
    undefined,
  );

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        비밀번호 재설정
      </button>
    );
  }

  return (
    <form action={formAction} className="field-row" style={{ marginTop: "0.5rem" }}>
      <input type="hidden" name="userId" value={userId} />
      <div className="field grow">
        <label>{name}님의 새 비밀번호 ({MIN_PASSWORD_LENGTH}자 이상)</label>
        <input name="newPassword" type="text" minLength={MIN_PASSWORD_LENGTH} required />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "재설정 중…" : "재설정"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
        닫기
      </button>
      {state && "error" in state ? <div className="error-msg">{state.error}</div> : null}
      {state && "done" in state ? <div className="done-msg">{state.done}</div> : null}
    </form>
  );
}

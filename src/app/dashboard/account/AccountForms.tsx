"use client";

import { useActionState } from "react";
import { MIN_PASSWORD_LENGTH, USERNAME_PATTERN } from "@/lib/validation";
import { changePasswordAction, changeUsernameAction, type AccountState } from "./actions";

function Feedback({ state }: { state: AccountState }) {
  if (!state) return null;
  if ("error" in state) return <div className="error-msg">{state.error}</div>;
  return <div className="done-msg">{state.done}</div>;
}

export function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    changeUsernameAction,
    undefined,
  );

  return (
    <>
      <form action={formAction} className="field-row">
        <div className="field grow">
          <label htmlFor="u-username">새 아이디</label>
          <input
            id="u-username"
            name="username"
            type="text"
            defaultValue={currentUsername}
            pattern={USERNAME_PATTERN}
            required
          />
        </div>
        <div className="field grow">
          <label htmlFor="u-current">현재 비밀번호</label>
          <input
            id="u-current"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "변경 중…" : "아이디 변경"}
        </button>
      </form>
      <Feedback state={state} />
    </>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<AccountState, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <>
      <form action={formAction} className="field-row">
        <div className="field grow">
          <label htmlFor="p-current">현재 비밀번호</label>
          <input
            id="p-current"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="field grow">
          <label htmlFor="p-new">새 비밀번호 ({MIN_PASSWORD_LENGTH}자 이상)</label>
          <input
            id="p-new"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </div>
        <div className="field grow">
          <label htmlFor="p-confirm">새 비밀번호 확인</label>
          <input
            id="p-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "변경 중…" : "비밀번호 변경"}
        </button>
      </form>
      <Feedback state={state} />
    </>
  );
}

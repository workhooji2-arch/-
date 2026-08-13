"use client";

import { useActionState } from "react";
import { signupAction, type FormState } from "./actions";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signupAction, undefined);

  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor="name">이름</label>
        <input id="name" name="name" type="text" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="username">아이디</label>
        <input id="username" name="username" type="text" autoComplete="username" required pattern="[a-zA-Z0-9_]{3,20}" />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호 (8자 이상)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <div className="field">
        <label htmlFor="passwordConfirm">비밀번호 확인</label>
        <input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "가입 중…" : "가입하기"}
      </button>
      {state?.error ? <div className="error-msg">{state.error}</div> : null}
    </form>
  );
}

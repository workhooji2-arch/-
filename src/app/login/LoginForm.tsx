"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "./actions";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(loginAction, undefined);

  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor="username">아이디</label>
        <input id="username" name="username" type="text" autoComplete="username" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </button>
      {state?.error ? <div className="error-msg">{state.error}</div> : null}
    </form>
  );
}

import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>조교 급여 대장</h1>
        <p className="sub">로그인하여 근무 기록과 급여를 확인하세요.</p>
        <LoginForm />
        <p className="switch">
          아직 계정이 없으신가요? <Link href="/signup">조교로 가입하기</Link>
        </p>
      </div>
    </div>
  );
}

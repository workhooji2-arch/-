import Link from "next/link";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>조교 가입</h1>
        <p className="sub">가입 후 시급은 관리자가 설정하면 근무 기록을 시작할 수 있습니다.</p>
        <SignupForm />
        <p className="switch">
          이미 계정이 있으신가요? <Link href="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { requireTA } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import { logoutAction } from "@/lib/actions";
import { PasswordForm, UsernameForm } from "./AccountForms";

export default async function AccountPage() {
  const user = await requireTA();

  return (
    <div className="shell" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand">
          <h1>계정 설정</h1>
          <p>{user.name}님의 로그인 정보를 변경합니다.</p>
        </div>
        <div className="who">
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            대시보드로
          </Link>
          <LogoutButton action={logoutAction} />
        </div>
      </header>

      <div className="panel">
        <h2>아이디 변경</h2>
        <div className="hint">
          영문, 숫자, 밑줄(_) 3~20자. 변경해도 근무 기록과 급여 내역은 그대로 유지됩니다.
        </div>
        <UsernameForm currentUsername={user.username} />
      </div>

      <div className="panel">
        <h2>비밀번호 변경</h2>
        <div className="hint">
          비밀번호를 잊으셨다면 관리자에게 요청하시면 새 비밀번호로 재설정해드립니다.
        </div>
        <PasswordForm />
      </div>
    </div>
  );
}

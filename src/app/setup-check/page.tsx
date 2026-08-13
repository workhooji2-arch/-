import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Check = { label: string; ok: boolean; detail: string };

export default async function SetupCheckPage() {
  const checks: Check[] = [];

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  checks.push({
    label: "ADMIN_USERNAME 환경 변수",
    ok: Boolean(adminUsername),
    detail: adminUsername
      ? `설정됨 — 아이디는 "${adminUsername}" 입니다`
      : "설정되지 않았습니다. 이것이 로그인이 안 되는 원인입니다.",
  });

  const passwordPadded = adminPassword ? adminPassword !== adminPassword.trim() : false;
  checks.push({
    label: "ADMIN_PASSWORD 환경 변수",
    ok: Boolean(adminPassword) && !passwordPadded,
    detail: !adminPassword
      ? "설정되지 않았습니다. 이것이 로그인이 안 되는 원인입니다."
      : passwordPadded
        ? "설정되었지만 앞뒤에 공백이 있습니다. 공백을 지우고 다시 저장하세요."
        : "설정됨",
  });

  checks.push({
    label: "JWT_SECRET 환경 변수",
    ok: Boolean(process.env.JWT_SECRET),
    detail: process.env.JWT_SECRET ? "설정됨" : "설정되지 않았습니다.",
  });

  let adminExists = false;
  try {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    adminExists = Boolean(admin);
    checks.push({
      label: "데이터베이스 연결",
      ok: true,
      detail: "정상적으로 연결되었습니다",
    });
    const credentialsReady = Boolean(adminUsername) && Boolean(adminPassword) && !passwordPadded;
    checks.push({
      label: "관리자 계정",
      // Before the very first login the account legitimately does not exist yet,
      // so that only counts as a problem when the credentials are missing too.
      ok: adminExists || credentialsReady,
      detail: admin
        ? `생성됨 — 아이디 "${admin.username}"`
        : credentialsReady
          ? "아직 만들어지지 않았습니다. 로그인 페이지에서 위 아이디로 한 번 로그인하면 자동으로 만들어집니다."
          : "만들 수 없습니다. 위의 환경 변수를 먼저 설정해주세요.",
    });
  } catch {
    checks.push({
      label: "데이터베이스 연결",
      ok: false,
      detail: "연결하지 못했습니다. DATABASE_URL 값을 확인해주세요.",
    });
  }

  const allOk = checks.every((c) => c.ok);

  return (
    <div className="shell" style={{ maxWidth: 640 }}>
      <header className="topbar">
        <div className="brand">
          <h1>설정 점검</h1>
          <p>로그인이 안 될 때 무엇이 빠졌는지 확인하는 페이지입니다.</p>
        </div>
      </header>

      <div className="panel">
        <table className="ledger">
          <tbody>
            {checks.map((c) => (
              <tr key={c.label}>
                <td style={{ width: "1.5rem", fontSize: "1.1rem" }}>{c.ok ? "✅" : "❌"}</td>
                <td>
                  <strong>{c.label}</strong>
                  <div style={{ color: "var(--ink-soft)", fontSize: "0.85rem" }}>{c.detail}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem", marginTop: "1.25rem" }}>
          {allOk
            ? "모든 항목이 정상입니다. 로그인 페이지에서 다시 시도해보세요."
            : "❌ 표시된 항목을 Vercel의 Settings → Environment Variables 에서 고친 뒤, 다시 배포(Redeploy)하면 해결됩니다."}
        </p>
      </div>
    </div>
  );
}

export default function LogoutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <button type="submit" className="btn btn-ghost btn-sm">
        로그아웃
      </button>
    </form>
  );
}

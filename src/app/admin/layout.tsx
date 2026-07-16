import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { canAccessAdmin } from "@/lib/authz";
import { logoutAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

/**
 * 관리자 콘솔 게이트. authz(1차 경계)로 role='admin'을 검사한다.
 * 비관리자·미로그인은 /login으로 보낸다. RLS는 심층 방어(2차).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActor();
  if (!canAccessAdmin(actor)) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      <header className="mb-6 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <Link href="/admin" className="text-[length:var(--text-lead)] font-bold text-[var(--color-fg-primary)]">
          살아보고 · 관리자
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="min-h-0 text-[length:var(--text-body-sm)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg-primary)]"
          >
            로그아웃
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}

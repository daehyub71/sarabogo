import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-[400px] flex-col justify-center px-4">
      <h1 className="mb-1 text-[length:var(--text-display-md)] font-bold text-[var(--color-fg-primary)]">
        관리자 로그인
      </h1>
      <p className="mb-6 text-[length:var(--text-body-sm)] text-[var(--color-fg-muted)]">
        살아보고 내부 콘솔
      </p>

      {error && (
        <p className="mb-4 rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-accent-warm)_12%,transparent)] px-3 py-2 text-[length:var(--text-body-sm)] text-[var(--color-accent-warm)]">
          {error}
        </p>
      )}

      <form action={loginAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-[length:var(--text-body-sm)] text-[var(--color-fg-secondary)]">
          이메일
          <input
            type="email"
            name="email"
            required
            autoComplete="username"
            className="min-h-[var(--touch-min)] rounded-[var(--radius-sm)] bg-[var(--color-bg-raised)] px-3 text-[length:var(--text-body)] ring-1 ring-inset ring-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-[length:var(--text-body-sm)] text-[var(--color-fg-secondary)]">
          비밀번호
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="min-h-[var(--touch-min)] rounded-[var(--radius-sm)] bg-[var(--color-bg-raised)] px-3 text-[length:var(--text-body)] ring-1 ring-inset ring-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          />
        </label>
        <button
          type="submit"
          className="mt-2 min-h-[var(--touch-min)] rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-[length:var(--text-body-lg)] font-bold text-[var(--color-bg-raised)] hover:opacity-90"
        >
          로그인
        </button>
      </form>
    </main>
  );
}

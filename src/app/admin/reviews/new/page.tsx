import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;

  // 지역 목록(레이아웃이 이미 admin 게이트를 통과시킴).
  let regions: { id: string; name: string }[] = [];
  try {
    const { getDb } = await import("@/lib/db");
    regions = (await getDb().listRegions())
      .map((r) => ({ id: r.id, name: r.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  } catch {
    regions = [];
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[length:var(--text-lead)] font-bold text-[var(--color-fg-primary)]">
        후기 시딩 입력
      </h1>

      {ok && (
        <p className="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] px-3 py-2 text-[length:var(--text-body-sm)] text-[var(--color-accent)]">
          저장되었습니다.
        </p>
      )}
      {error && (
        <p className="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-accent-warm)_12%,transparent)] px-3 py-2 text-[length:var(--text-body-sm)] text-[var(--color-accent-warm)]">
          {error}
        </p>
      )}

      <ReviewForm regions={regions} />
    </div>
  );
}

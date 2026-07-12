import { FeedList } from "@/components/feed/FeedList";
import { DEMO_REGIONS } from "@/lib/fixtures/demo-regions";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-[var(--feed-max-width)] px-4 py-6">
      <header className="mb-6">
        <h1 className="text-[length:var(--text-display-lg)] leading-[var(--text-display-lg--line-height)] font-bold text-[var(--color-fg-primary)]">
          살아보고
        </h1>
        <p className="mt-2 text-[length:var(--text-lead)] leading-[var(--text-lead--line-height)] text-[var(--color-fg-secondary)]">
          살아본 사람에게 묻고, 나에게 맞게 떠난다.
        </p>
      </header>

      {/* Phase 1에서 큰 버튼 3종(바다 근처 / 병원 가까운 곳 / 저예산) + 실데이터로 교체 */}
      <FeedList regions={DEMO_REGIONS} />
    </main>
  );
}

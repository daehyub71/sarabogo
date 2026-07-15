import { RegionExplorer } from "@/components/feed/RegionExplorer";
import type { RegionCardData } from "@/components/RegionCard";
import { summaryToCard } from "@/lib/region-card";
import { DEMO_REGIONS } from "@/lib/fixtures/demo-regions";

// 요청 시점에 실 DB를 읽는다(수집 데이터 반영). 정적 캐시하지 않는다.
export const dynamic = "force-dynamic";

/** 실 DB에서 지역 요약을 읽어 카드 데이터로. env 없으면 데모로 폴백(배포 초기 안전장치). */
async function loadRegions(): Promise<RegionCardData[]> {
  try {
    const { getDb } = await import("@/lib/db");
    const summaries = await getDb().listRegionSummaries();
    if (summaries.length === 0) return DEMO_REGIONS;
    return summaries.map(summaryToCard);
  } catch {
    // Supabase 환경변수 미설정 등 → 데모 데이터로 화면을 채운다.
    return DEMO_REGIONS;
  }
}

export default async function HomePage() {
  const regions = await loadRegions();

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

      <RegionExplorer regions={regions} />
    </main>
  );
}

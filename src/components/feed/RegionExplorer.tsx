"use client";

import { useMemo, useState } from "react";
import { FeedList } from "@/components/feed/FeedList";
import type { RegionCardData } from "@/components/RegionCard";
import { cn } from "@/lib/cn";

/**
 * 랜딩 진입 — 큰 버튼 3종으로 로그인 없이 즉시 탐색 (FR-1.1).
 * 시니어 UX: 버튼은 크고(48px+), 아이콘 없이 명확한 한글 레이블.
 */
type Filter = "sea" | "hospital" | "budget" | "mountain";

const BUTTONS: { key: Filter; label: string; hint: string }[] = [
  { key: "sea", label: "바다 근처", hint: "바다·해변이 있는 곳" },
  { key: "mountain", label: "산 가까운 곳", hint: "100대명산이 있는 곳" },
  { key: "hospital", label: "병원 가까운 곳", hint: "의료시설이 많은 순" },
  { key: "budget", label: "저예산", hint: "한 달 실비가 낮은 순" },
];

function applyFilter(regions: RegionCardData[], filter: Filter | null): RegionCardData[] {
  if (filter === null) return regions;
  const list = [...regions];
  switch (filter) {
    case "hospital":
      // 병원 수가 많은 순 (의료 인프라)
      return list.sort((a, b) => b.hospitalCount - a.hospitalCount);
    case "budget":
      // 한달실비 낮은 순. null(정보 없음)은 뒤로.
      return list.sort((a, b) => {
        if (a.avgMonthlyCost === null) return 1;
        if (b.avgMonthlyCost === null) return -1;
        return a.avgMonthlyCost - b.avgMonthlyCost;
      });
    case "mountain":
      // 근처 100대명산 있는 곳만, 많은 순
      return list.filter((r) => r.mountainCount > 0).sort((a, b) => b.mountainCount - a.mountainCount);
    case "sea":
      // 바다 태그 우선(없으면 전체 유지 — 데이터가 쌓이기 전 빈 화면 방지)
      return list.sort((a, b) => Number(b.tags.includes("바다")) - Number(a.tags.includes("바다")));
  }
}

export function RegionExplorer({ regions }: { regions: RegionCardData[] }) {
  const [filter, setFilter] = useState<Filter | null>(null);
  const shown = useMemo(() => applyFilter(regions, filter), [regions, filter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {BUTTONS.map((b) => {
          const active = filter === b.key;
          return (
            <button
              key={b.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? null : b.key)}
              className={cn(
                "flex min-h-[var(--touch-min)] flex-col items-start justify-center rounded-[var(--radius-md)] px-4 py-3 text-left ring-1 ring-inset transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-bg-raised)] ring-[var(--color-accent)]"
                  : "bg-[var(--color-bg-raised)] text-[var(--color-fg-primary)] ring-[var(--color-border)] hover:ring-[var(--color-border-strong)]",
              )}
            >
              <span className="text-[length:var(--text-body-lg)] font-bold">{b.label}</span>
              <span
                className={cn(
                  "text-[length:var(--text-body-sm)]",
                  active ? "text-[var(--color-bg-raised)]" : "text-[var(--color-fg-muted)]",
                )}
              >
                {b.hint}
              </span>
            </button>
          );
        })}
      </div>

      <FeedList regions={shown} />
    </div>
  );
}

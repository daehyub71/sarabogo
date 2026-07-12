"use client";

import { useState } from "react";
import { RegionCard, type RegionCardData } from "@/components/RegionCard";

/**
 * 세로 1열 카드 피드 — 인스타/페북 형태를 쓰되 시니어 안전장치를 넣는다.
 * 무한 스크롤 금지: 10개씩 보여주고 "더 보기" 버튼으로 이어붙인다 (FR-UI.2).
 * 이유: 시니어가 현재 위치를 잃지 않고, 뒤로가기 시 스크롤이 보존된다.
 */
const PAGE_SIZE = 10;

export function FeedList({ regions }: { regions: RegionCardData[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = regions.slice(0, visible);
  const remaining = regions.length - shown.length;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex list-none flex-col gap-4 p-0">
        {shown.map((region) => (
          <li key={region.id}>
            <RegionCard region={region} />
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mx-auto w-full max-w-[320px] rounded-[var(--radius-md)] bg-[var(--color-accent)] px-6 py-3 text-[length:var(--text-body-lg)] font-bold text-[var(--color-bg-raised)] transition-opacity duration-[var(--duration-fast)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
        >
          더 보기 ({Math.min(remaining, PAGE_SIZE)}개)
        </button>
      )}
    </div>
  );
}

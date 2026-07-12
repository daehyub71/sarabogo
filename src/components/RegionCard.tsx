import Link from "next/link";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { StarRating } from "@/components/ui/StarRating";

/**
 * 지역 카드 — 블랙야크 MountainCard를 이식해 "시니어의 생활 지표"를 먼저 보이게 재구성.
 * 관광지 사진이 아니라 병원 접근·한달실비·후기·별점이 카드의 주인공이다 (FR-1.2).
 * 모든 지표는 nullable이며 근거 없으면 "정보 없음"으로 노출한다.
 */
export interface RegionCardData {
  id: string;
  name: string;
  imageUrl: string | null;
  /** 병원까지 차로 걸리는 분. 없으면 null. */
  hospitalMinutes: number | null;
  /** 평균 한달실비(만원). 없으면 null. */
  avgMonthlyCost: number | null;
  /** 공개(검수된) 후기 수. */
  reviewCount: number;
  /** 종합 별점(1~5). 후기 없으면 null. */
  avgStars: number | null;
  tags: string[];
}

const MAX_VISIBLE_TAGS = 3;

function metric(value: number | null, format: (n: number) => string): string {
  return value === null ? "정보 없음" : format(value);
}

export function RegionCard({
  region,
  className,
}: {
  region: RegionCardData;
  className?: string;
}) {
  const visibleTags = region.tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = region.tags.length - visibleTags.length;

  return (
    <Link
      href={`/regions/${region.id}`}
      className={cn(
        "group block overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-bg-raised)] ring-1 ring-inset ring-[var(--color-border)] shadow-[var(--shadow-sm)] transition-shadow duration-[var(--duration-base)] ease-[var(--ease-out)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--color-bg-sunken)]">
        {region.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={region.imageUrl}
            alt={`${region.name} 전경`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[var(--duration-medium)] ease-[var(--ease-out)] group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-fg-muted)]">
            사진 준비 중
          </div>
        )}
        <div className="absolute right-3 top-3">
          <Badge tone="accent">
            후기 {region.reviewCount}건
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[length:var(--text-display-md)] leading-[var(--text-display-md--line-height)] font-bold text-[var(--color-fg-primary)]">
            {region.name}
          </h3>
          <StarRating value={region.avgStars} />
        </div>

        {/* 생활 지표 — 관광지가 아니라 "한 달 살 수 있는가" */}
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[length:var(--text-body-sm)] text-[var(--color-fg-secondary)]">
          <div className="inline-flex items-center gap-1">
            <dt className="text-[var(--color-fg-muted)]">병원</dt>
            <dd className="tabular-nums">
              {metric(region.hospitalMinutes, (n) => `차로 ${n}분`)}
            </dd>
          </div>
          <div className="inline-flex items-center gap-1">
            <dt className="text-[var(--color-fg-muted)]">한 달</dt>
            <dd className="tabular-nums">
              {metric(region.avgMonthlyCost, (n) => `${n}만원`)}
            </dd>
          </div>
        </dl>

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {visibleTags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
            {overflow > 0 && (
              <span className="text-[length:var(--text-label)] text-[var(--color-fg-muted)]">
                +{overflow}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

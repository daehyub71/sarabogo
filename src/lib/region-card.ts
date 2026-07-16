/**
 * RegionSummary(도메인) → RegionCardData(프레젠테이션) 매핑.
 * 화면이 도메인 타입을 직접 알지 않도록 경계에서 변환한다.
 */
import type { RegionCardData } from "@/components/RegionCard";
import type { RegionSummary } from "@/types/domain";

export function summaryToCard(s: RegionSummary): RegionCardData {
  return {
    id: s.id,
    name: s.name,
    imageUrl: s.coverImageUrl,
    hospitalCount: s.hospitalCount,
    pharmacyCount: s.pharmacyCount,
    hospitalMinutes: null, // Q4(병원 접근 시간 산출) 확정 후 채운다
    avgMonthlyCost: s.avgMonthlyCost,
    reviewCount: s.reviewCount,
    avgStars: s.avgStars,
    mountainCount: s.mountainCount,
    tags: [], // 태그 파생은 Phase 2 후기 데이터 이후
  };
}

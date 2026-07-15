import type { RegionCardData } from "@/components/RegionCard";

/**
 * 데모용 목 데이터 — 실 DB(env) 연결 실패 시 폴백으로만 쓴다.
 * 로컬(.env 있음)과 배포(env 설정)에서는 실제 수집 데이터가 뜬다.
 * 일부 지표를 의도적으로 null로 둬서 "정보 없음" 노출을 확인한다 (null 정책 시연).
 */
export const DEMO_REGIONS: RegionCardData[] = [
  {
    id: "boryeong",
    name: "충남 보령시",
    imageUrl: null,
    hospitalCount: 100,
    pharmacyCount: 49,
    hospitalMinutes: null,
    avgMonthlyCost: null, // 후기 없음 → "정보 없음"
    reviewCount: 0,
    avgStars: null,
    tags: ["바다", "조용함"],
  },
  {
    id: "gangjin",
    name: "전남 강진군",
    imageUrl: null,
    hospitalCount: 21,
    pharmacyCount: 12,
    hospitalMinutes: null,
    avgMonthlyCost: null,
    reviewCount: 0,
    avgStars: null,
    tags: ["평지", "한적함"],
  },
];

import type { RegionCardData } from "@/components/RegionCard";

/**
 * 데모용 목 데이터 — Phase 1에서 실제 배치(관광공사+심평원+후기 집계)로 대체된다.
 * 일부 지표를 의도적으로 null로 둬서 "정보 없음" 노출을 확인한다 (null 정책 시연).
 */
export const DEMO_REGIONS: RegionCardData[] = [
  {
    id: "boryeong",
    name: "충남 보령시",
    imageUrl: null,
    hospitalMinutes: 8,
    avgMonthlyCost: 82,
    reviewCount: 12,
    avgStars: 4.3,
    tags: ["바다", "조용함", "의료좋음"],
  },
  {
    id: "gangjin",
    name: "전남 강진군",
    imageUrl: null,
    hospitalMinutes: 15,
    avgMonthlyCost: 68,
    reviewCount: 5,
    avgStars: 3.8,
    tags: ["평지", "한적함"],
  },
  {
    id: "yeongdeok",
    name: "경북 영덕군",
    imageUrl: null,
    hospitalMinutes: null, // 근거 없음 → "정보 없음"
    avgMonthlyCost: 74,
    reviewCount: 3,
    avgStars: null, // 후기 별점 근거 부족 → "정보 없음"
    tags: ["바다", "대게"],
  },
  {
    id: "namhae",
    name: "경남 남해군",
    imageUrl: null,
    hospitalMinutes: 12,
    avgMonthlyCost: 88,
    reviewCount: 9,
    avgStars: 4.6,
    tags: ["바다", "따뜻함", "커뮤니티"],
  },
];

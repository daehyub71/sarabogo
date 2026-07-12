/**
 * 후기 집계 — null 정책의 코드 구현.
 *
 * 별점은 nullable이며, null은 "정보 없음"이지 0이 아니다 (CLAUDE.md).
 * 평균은 반드시 null을 제외하고 계산한다. 근거 있는 값이 하나도 없으면 null을 반환한다.
 */
import type { Review } from "@/types/domain";

/** null을 제외한 평균. 유효값이 없으면 null(=정보 없음). */
export function averageStars(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  const sum = present.reduce((a, b) => a + b, 0);
  return Math.round((sum / present.length) * 10) / 10;
}

/** 후기 배열에서 한 축(예: 의료접근성)의 평균 별점. */
export function averageOf(
  reviews: Review[],
  key: "medicalAccess" | "loneliness" | "transport" | "revisit",
): number | null {
  return averageStars(reviews.map((r) => r[key]));
}

/** 지역 카드가 보여줄 종합 별점 — 4개 축 전체 평균(null 제외). */
export function overallStars(reviews: Review[]): number | null {
  const all = reviews.flatMap((r) => [
    r.medicalAccess,
    r.loneliness,
    r.transport,
    r.revisit,
  ]);
  return averageStars(all);
}

/** 평균 한달실비(만원). 근거 없으면 null. */
export function averageMonthlyCost(reviews: Review[]): number | null {
  const present = reviews
    .map((r) => r.monthlyCost)
    .filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return Math.round(present.reduce((a, b) => a + b, 0) / present.length);
}

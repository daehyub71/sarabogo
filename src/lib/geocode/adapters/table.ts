/**
 * 좌표 테이블(수기 보정) 지오코더 — fallback 어댑터.
 *
 * 용도:
 *   - 카카오 승인 전/거부 시 개발을 막지 않는 대체 경로
 *   - 카카오가 못 찾은 주소를 사람이 손으로 보정한 좌표를 주입 (지오코딩 실패 큐, R3)
 *
 * 외부 호출이 없으므로 테스트·오프라인에서도 동작한다.
 */
import type { GeocodePort, GeoPoint } from "@/lib/geocode/port";

export function createTableGeocoder(table: Record<string, GeoPoint>): GeocodePort {
  return {
    async geocode(query) {
      // 완전일치 우선, 없으면 부분포함 매칭(주소 표기 흔들림 대응).
      if (table[query]) return table[query];
      const key = Object.keys(table).find(
        (k) => query.includes(k) || k.includes(query),
      );
      return key ? table[key] : null;
    },
  };
}

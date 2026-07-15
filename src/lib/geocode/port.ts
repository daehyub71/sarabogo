/**
 * GeocodePort — 주소 → 좌표 변환의 경계.
 *
 * ⚠️ 범위 주의: 병원·약국은 심평원이 좌표를 직접 준다(lib/hira). 지오코딩이 필요 없다.
 * 지오코딩이 실제로 필요한 대상은 좌표가 없는 것들이다:
 *   - 지자체 지원 프로그램(A층)의 숙소·모집처 주소
 *   - 카카오 로컬 키워드로 찾는 생활편의(마트 등) 중 좌표 보정이 필요한 경우
 *
 * 기본 어댑터는 카카오(시니어 친숙도 · 국내 주소 정확도). 승인 지연/거부에 대비해
 * fallback 어댑터를 둔다 — DB·LLM과 같은 포트+어댑터 패턴.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
  /** 정규화된 주소(어댑터가 돌려준 표준 주소). 없으면 원본. */
  address: string;
}

export interface GeocodePort {
  /** 주소를 좌표로 변환한다. 못 찾으면 null (호출측이 보정 큐로 넘긴다). */
  geocode(query: string): Promise<GeoPoint | null>;
}

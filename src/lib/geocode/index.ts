/**
 * GeocodePort 팩토리 — 지오코딩 진입점.
 *
 * GEOCODE_PROVIDER 환경변수로 어댑터를 고른다. 기본은 kakao.
 * 카카오 승인 지연/거부 시 'table'로 바꾸면 개발이 막히지 않는다.
 */
import type { GeocodePort } from "@/lib/geocode/port";
import { createKakaoGeocoder } from "@/lib/geocode/adapters/kakao";
import { createTableGeocoder } from "@/lib/geocode/adapters/table";

let instance: GeocodePort | null = null;

export function getGeocoder(): GeocodePort {
  if (instance) return instance;
  const provider = process.env.GEOCODE_PROVIDER ?? "kakao";
  instance =
    provider === "table"
      ? createTableGeocoder({}) // 보정 테이블은 배치가 주입한다.
      : createKakaoGeocoder();
  return instance;
}

export function setGeocoder(g: GeocodePort): void {
  instance = g;
}

export type { GeocodePort, GeoPoint } from "@/lib/geocode/port";
export { createKakaoGeocoder } from "@/lib/geocode/adapters/kakao";
export { createTableGeocoder } from "@/lib/geocode/adapters/table";

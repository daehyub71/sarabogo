/**
 * 카카오 로컬 API 지오코딩 어댑터 — 기본 구현.
 *
 * 서버 전용. KAKAO_REST_API_KEY를 Authorization 헤더로 보낸다(도메인 등록 불필요).
 * ⚠️ 카카오맵 제품 승인 전에는 403 "OPEN_MAP_AND_LOCAL disabled"가 난다.
 *    승인되면 코드 변경 없이 동작한다 (2026-07-12 기준 심사 대기).
 */
import type { GeocodePort, GeoPoint } from "@/lib/geocode/port";

const ADDR_URL = "https://dapi.kakao.com/v2/local/search/address.json";
const KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json";

interface KakaoDoc {
  x: string; // 경도(lng)
  y: string; // 위도(lat)
  address_name?: string;
  place_name?: string;
  road_address_name?: string;
}
interface KakaoResponse {
  documents?: KakaoDoc[];
}

export function createKakaoGeocoder(opts?: { apiKey?: string }): GeocodePort {
  const key = opts?.apiKey ?? process.env.KAKAO_REST_API_KEY;

  async function call(url: string, query: string): Promise<KakaoDoc | null> {
    if (!key) throw new Error("KAKAO_REST_API_KEY 미설정");
    const res = await fetch(`${url}?query=${encodeURIComponent(query)}&size=1`, {
      headers: { Authorization: `KakaoAK ${key}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`카카오 지오코딩 실패 (${res.status}): ${body.slice(0, 160)}`);
    }
    const json = (await res.json()) as KakaoResponse;
    return json.documents?.[0] ?? null;
  }

  function toPoint(doc: KakaoDoc, fallbackAddr: string): GeoPoint {
    return {
      lat: Number(doc.y),
      lng: Number(doc.x),
      address: doc.road_address_name || doc.address_name || doc.place_name || fallbackAddr,
    };
  }

  return {
    async geocode(query) {
      // 1) 주소 검색 우선. 실패 시 2) 키워드 검색으로 폴백(상호·장소명 대응).
      const byAddr = await call(ADDR_URL, query);
      if (byAddr) return toPoint(byAddr, query);
      const byKeyword = await call(KEYWORD_URL, query);
      return byKeyword ? toPoint(byKeyword, query) : null;
    },
  };
}

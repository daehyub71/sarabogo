/**
 * 외부 API 응답 → Place 매핑 (순수 함수).
 *
 * 심평원 병원·약국은 좌표(XPos/YPos)를 직접 주므로 지오코딩 없이 lat/lng가 채워진다.
 * 관광공사는 mapx/mapy를 준다. 좌표가 없는 건은 lat/lng=null로 두고 화면이 마커를 그리지 않는다.
 */
import type { HiraFacility } from "@/lib/hira";
import type { KtoAreaItem } from "@/lib/kto";
import type { NewPlace, PlaceKind } from "@/types/domain";

/** 심평원 시설 → Place. 종별·요양기호를 meta에 보존한다. */
export function hiraToPlace(regionId: string, f: HiraFacility): NewPlace {
  return {
    regionId,
    contentId: null,
    googlePlaceId: null,
    kind: f.kind, // "hospital" | "pharmacy"
    name: f.name,
    address: f.address || null,
    lat: f.lat,
    lng: f.lng,
    meta: {
      clCdNm: f.clCdNm || null, // 종합병원/요양병원/약국 등
      tel: f.tel,
      ykiho: f.ykiho, // 상세조회 키
    },
    source: "hira",
  };
}

/** 관광공사 contentTypeId → Place kind. */
const CONTENT_TYPE_KIND: Record<string, PlaceKind> = {
  "12": "tour", // 관광지
  "32": "stay", // 숙박
  "15": "festival", // 행사/공연/축제
};

/** 관광공사 지역기반 아이템 → Place. */
export function ktoToPlace(regionId: string, item: KtoAreaItem): NewPlace {
  return {
    regionId,
    contentId: item.contentId || null,
    googlePlaceId: null,
    kind: CONTENT_TYPE_KIND[item.contentTypeId] ?? "tour",
    name: item.title,
    address: item.addr,
    lat: item.lat,
    lng: item.lng,
    meta: item.firstImage ? { firstImage: item.firstImage } : null,
    source: "kto",
  };
}

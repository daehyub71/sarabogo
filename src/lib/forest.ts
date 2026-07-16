/**
 * 한국등산트레킹지원센터 100대명산 목록정보 클라이언트.
 *
 * ⚠️ 정부(산림청) 공식 100대명산이다. 블랙야크 등 민간 브랜드 리스트가 아니다.
 * 출처표시(공공누리)로 자유이용. 서버 전용(serviceKey는 data.go.kr 공용 키).
 *
 * 실호출로 확인한 응답(2026-07-16):
 *   resultCode "0" 정상. item: frtrlNm(산명)·ctpvNm(시도)·addrNm(주소)·
 *   lat(위도)·lot(경도, lng 아님)·aslAltide(고도)·mtnCd(산코드).
 */
const BASE =
  "https://apis.data.go.kr/B553662/top100FamtListBasiInfoService/getTop100FamtListBasiInfoList";

export class ForestError extends Error {
  constructor(message: string, readonly resultCode?: string) {
    super(message);
    this.name = "ForestError";
  }
}

/**
 * 100대명산 한 곳. 좌표 직접 제공(지오코딩 불필요).
 * ⚠️ 키는 frtrlId(산식별자)다. mtnCd는 유일하지 않다 — 서로 다른 산이 같은 코드를
 *    공유하는 경우가 있다(월출산=유명산 등, 정부 API 데이터 특성. 2026-07-16 확인).
 */
export interface Mountain {
  id: string; // frtrlId (유일)
  mtnCd: string;
  name: string;
  province: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  altitude: number | null;
}

interface RawItem {
  frtrlId?: string;
  mtnCd?: string;
  frtrlNm?: string;
  ctpvNm?: string;
  addrNm?: string;
  lat?: number;
  lot?: number; // 경도
  aslAltide?: number;
}
interface Response {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: { items?: { item?: RawItem | RawItem[] } };
  };
}

function toMountain(r: RawItem): Mountain {
  return {
    id: r.frtrlId ?? "",
    mtnCd: r.mtnCd ?? "",
    name: r.frtrlNm ?? "",
    province: r.ctpvNm ?? null,
    address: r.addrNm ?? null,
    lat: typeof r.lat === "number" ? r.lat : null,
    lng: typeof r.lot === "number" ? r.lot : null,
    altitude: typeof r.aslAltide === "number" ? r.aslAltide : null,
  };
}

/** 응답 JSON을 파싱한다. resultCode가 정상("0"/"00")이 아니면 throw. */
export function parseMountains(json: Response): Mountain[] {
  const code = json.response?.header?.resultCode;
  if (code && code !== "0" && code !== "00" && code !== "0000") {
    throw new ForestError(
      `산림청 오류 ${code}: ${json.response?.header?.resultMsg ?? ""}`.trim(),
      code,
    );
  }
  const item = json.response?.body?.items?.item;
  if (!item) return [];
  return (Array.isArray(item) ? item : [item]).map(toMountain);
}

/** 100대명산 전체 목록을 받아온다(100건, 한 페이지). */
export async function fetchTop100Mountains(serviceKey: string): Promise<Mountain[]> {
  const url = `${BASE}?serviceKey=${encodeURIComponent(serviceKey)}&pageNo=1&numOfRows=100&type=json`;
  let res: globalThis.Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new ForestError(`산림청 요청 실패: ${String(err)}`);
  }
  if (!res.ok) throw new ForestError(`산림청 HTTP 오류 ${res.status}`);
  return parseMountains((await res.json()) as Response);
}

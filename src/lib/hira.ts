/**
 * 건강보험심사평가원(심평원) 병원·약국 정보 클라이언트.
 *
 * 모든 심평원 호출은 이 모듈만 경유한다 (직접 fetch 금지, 관광공사 규칙과 동일).
 * 서버(Route Handler / Edge Function)에서만 사용한다. serviceKey를 클라이언트에 노출하지 않는다.
 *
 * ⚠️ 실호출로 확인한 사실 (2026-07-12):
 *   - 응답은 XML이다 (관광공사 JSON과 다름).
 *   - 병원·약국 응답에 XPos(경도)·YPos(위도)가 **직접 포함**된다.
 *     → 지오코딩이 필요 없다. 좌표를 그대로 지도에 찍을 수 있다.
 *   - resultCode 정상값은 "00" (관광공사 "0000"과 다름).
 */

const BASE = "https://apis.data.go.kr/B551182";

const OP = {
  hospital: "hospInfoServicev2/getHospBasisList",
  pharmacy: "pharmacyInfoService/getParmacyBasisList",
} as const;

/** 심평원 API 오류(HTTP 오류 또는 resultCode != 00). */
export class HiraError extends Error {
  constructor(
    message: string,
    readonly resultCode?: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "HiraError";
  }
}

/** 병원·약국 공통 시설 정보 (좌표 포함). */
export interface HiraFacility {
  name: string; // yadmNm
  kind: "hospital" | "pharmacy";
  clCdNm: string; // 종별: 종합병원 / 요양병원 / 약국 등
  address: string; // addr
  tel: string | null; // telno
  lat: number | null; // YPos
  lng: number | null; // XPos
  sidoName: string; // sidoCdNm
  sigunguName: string; // sgguCdNm
  ykiho: string | null; // 암호화 요양기호 (상세조회 키)
}

export interface HiraQuery {
  serviceKey: string;
  sidoCd?: string;
  sgguCd?: string;
  yadmNm?: string; // 기관명 부분검색
  pageNo?: number;
  numOfRows?: number;
  signal?: AbortSignal;
}

// ── XML 파싱 (심평원 응답은 평평한 flat 구조라 정규식으로 견고하게 처리) ──

/** 최소 XML 엔티티 디코딩. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** <tag>value</tag>에서 첫 번째 태그 값을 꺼낸다. 없으면 null. */
function pick(itemXml: string, tag: string): string | null {
  const m = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1].trim()) : null;
}

function toNum(v: string | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 응답 XML에서 resultCode를 확인하고, 정상이면 item 목록을 반환한다. */
function parseItems(xml: string): string[] {
  const code = xml.match(/<resultCode>(\d+)<\/resultCode>/)?.[1];
  if (code && code !== "00") {
    const msg = xml.match(/<resultMsg>([^<]*)<\/resultMsg>/)?.[1] ?? "";
    throw new HiraError(`심평원 오류 ${code}: ${msg}`, code);
  }
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
}

async function hiraRequest(
  operation: string,
  query: HiraQuery,
): Promise<string[]> {
  const params = new URLSearchParams({ serviceKey: query.serviceKey });
  if (query.sidoCd) params.set("sidoCd", query.sidoCd);
  if (query.sgguCd) params.set("sgguCd", query.sgguCd);
  if (query.yadmNm) params.set("yadmNm", query.yadmNm);
  params.set("pageNo", String(query.pageNo ?? 1));
  params.set("numOfRows", String(query.numOfRows ?? 100));

  let res: Response;
  try {
    res = await fetch(`${BASE}/${operation}?${params}`, { signal: query.signal });
  } catch (err) {
    throw new HiraError(`심평원 요청 실패 (${operation}): ${String(err)}`);
  }
  if (!res.ok) {
    throw new HiraError(`심평원 HTTP 오류 (${operation})`, undefined, res.status);
  }
  return parseItems(await res.text());
}

function toFacility(itemXml: string, kind: HiraFacility["kind"]): HiraFacility {
  return {
    name: pick(itemXml, "yadmNm") ?? "",
    kind,
    clCdNm: pick(itemXml, "clCdNm") ?? "",
    address: pick(itemXml, "addr") ?? "",
    tel: pick(itemXml, "telno"),
    lat: toNum(pick(itemXml, "YPos")),
    lng: toNum(pick(itemXml, "XPos")),
    sidoName: pick(itemXml, "sidoCdNm") ?? "",
    sigunguName: pick(itemXml, "sgguCdNm") ?? "",
    ykiho: pick(itemXml, "ykiho"),
  };
}

/** 지역(시도/시군구 코드)의 병원 목록을 좌표와 함께 조회한다. */
export async function fetchHospitals(query: HiraQuery): Promise<HiraFacility[]> {
  const items = await hiraRequest(OP.hospital, query);
  return items.map((x) => toFacility(x, "hospital"));
}

/** 지역의 약국 목록을 좌표와 함께 조회한다. */
export async function fetchPharmacies(query: HiraQuery): Promise<HiraFacility[]> {
  const items = await hiraRequest(OP.pharmacy, query);
  return items.map((x) => toFacility(x, "pharmacy"));
}

/** 테스트용: XML 문자열을 시설 목록으로 파싱한다 (실 응답 fixture 검증). */
export function parseFacilitiesXml(
  xml: string,
  kind: HiraFacility["kind"],
): HiraFacility[] {
  return parseItems(xml).map((x) => toFacility(x, kind));
}

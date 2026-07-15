/**
 * 한국관광공사 TourAPI 4.0 클라이언트.
 *
 * 이 프로젝트의 모든 관광공사 호출은 이 모듈만 경유한다 (CLAUDE.md C-1).
 * 직접 `fetch` 금지 — AppName=sarabogo 누락은 운영계정 승인 거부 사유다.
 * 서버(Route Handler / Edge Function)에서만 사용한다. serviceKey를 클라이언트에 노출하지 않는다.
 */

/**
 * 모든 요청에 강제 부착되는 앱 식별자. 호출자가 덮어쓸 수 없다.
 *
 * ⚠️ TourAPI(KorService2)의 앱 식별 파라미터는 `MobileApp`이다.
 * `AppName`이라는 파라미터는 존재하지 않으며, 보내면 API가 거부한다
 * (resultCode 10 · INVALID_REQUEST_PARAMETER_ERROR(AppName)). 실호출로 확인함.
 * 운영계정 심사가 요구하는 "일관된 앱 이름"은 이 MobileApp 값으로 충족한다.
 */
const APP_NAME = "sarabogo";

const BASE_URL = "https://apis.data.go.kr/B551011/KorService2";

/** 관광공사 API 오류(HTTP 오류 또는 resultCode != 0000). */
export class KtoError extends Error {
  constructor(
    message: string,
    readonly resultCode?: string,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "KtoError";
  }
}

export interface KtoRequestOptions {
  /** 공공데이터포털 인증키. 서버 환경변수 TOUR_API_KEY에서 주입한다. */
  serviceKey: string;
  /** 실패 시 재시도 횟수 (기본 2). 지수 백오프. */
  retries?: number;
  /** 테스트/취소용 AbortSignal. */
  signal?: AbortSignal;
}

/** 관광공사 공통 응답 헤더. */
interface KtoHeader {
  resultCode?: string;
  resultMsg?: string;
}

/**
 * 관광공사 API를 호출한다. AppName·serviceKey·공통 파라미터를 자동 주입한다.
 *
 * @param operation TourAPI 오퍼레이션명 (예: "areaCode2", "areaBasedList2")
 * @param params 오퍼레이션별 파라미터. AppName은 넘겨도 무시되고 sarabogo가 강제된다.
 * @returns 파싱된 JSON 응답 본문
 * @throws {KtoError} HTTP 오류 또는 resultCode가 0000이 아닐 때
 */
export async function ktoRequest<T = unknown>(
  operation: string,
  params: Record<string, string> = {},
  options: KtoRequestOptions,
): Promise<T> {
  const retries = options.retries ?? 2;

  // 호출자가 넘긴 params에 AppName이 섞여 들어오면 API가 400을 낸다. 방어적으로 제거한다.
  const { AppName: _ignored, ...callerParams } = params;
  void _ignored;

  const search = new URLSearchParams({
    ...callerParams,
    // 아래 4개는 호출자 params보다 뒤에 놓아 항상 우선한다.
    serviceKey: options.serviceKey,
    MobileOS: "ETC",
    MobileApp: APP_NAME,
    _type: "json",
  });

  const url = `${BASE_URL}/${operation}?${search.toString()}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: options.signal });
      if (!res.ok) {
        throw new KtoError(
          `관광공사 HTTP 오류 (${operation})`,
          undefined,
          res.status,
        );
      }

      const json = (await res.json()) as {
        response?: { header?: KtoHeader };
      } & KtoHeader;

      // ⚠️ KorService2는 응답 형태가 두 가지다 (실호출로 확인).
      //   성공: { response: { header: { resultCode: "0000" }, body: {...} } }
      //   오류: { resultCode: "10", resultMsg: "INVALID_REQUEST_PARAMETER_ERROR(...)" }  ← 평평함
      // 중첩 경로만 검사하면 오류를 성공으로 오인한다.
      const header = json?.response?.header ?? json;
      if (header?.resultCode && header.resultCode !== "0000") {
        throw new KtoError(
          `관광공사 오류 ${header.resultCode}: ${header.resultMsg ?? ""}`.trim(),
          header.resultCode,
        );
      }

      return json as T;
    } catch (err) {
      lastError = err;
      // 마지막 시도이거나 취소면 즉시 종료.
      if (attempt === retries || (err instanceof DOMException && err.name === "AbortError")) {
        break;
      }
      await sleep(2 ** attempt * 200);
    }
  }

  if (lastError instanceof KtoError) throw lastError;
  throw new KtoError(
    `관광공사 요청 실패 (${operation}): ${String(lastError)}`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── 지역기반 관광정보 (수집 배치용) ─────────────────────────────

/** areaBasedList2 정규화 아이템. mapx=경도, mapy=위도. */
export interface KtoAreaItem {
  contentId: string;
  contentTypeId: string;
  title: string;
  addr: string | null;
  lat: number | null; // mapy
  lng: number | null; // mapx
  firstImage: string | null;
}

interface KtoRawItem {
  contentid?: string;
  contenttypeid?: string;
  title?: string;
  addr1?: string;
  mapx?: string;
  mapy?: string;
  firstimage?: string;
}

interface AreaBasedResponse {
  response?: { body?: { items?: { item?: KtoRawItem | KtoRawItem[] } } };
}

/** items.item은 1건이면 객체, 여러 건이면 배열, 0건이면 빈 문자열로 온다. 항상 배열로 정규화. */
function asArray<T>(v: T | T[] | "" | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function toNum(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 지역기반 관광정보를 조회한다 (areaBasedList2).
 * @param contentTypeId 12=관광지, 32=숙박, 39=음식점, 15=행사 등
 */
export async function fetchAreaBasedList(
  params: {
    areaCode: number;
    sigunguCode?: number;
    contentTypeId: number;
    numOfRows?: number;
    pageNo?: number;
  },
  options: KtoRequestOptions,
): Promise<KtoAreaItem[]> {
  const req: Record<string, string> = {
    areaCode: String(params.areaCode),
    contentTypeId: String(params.contentTypeId),
    numOfRows: String(params.numOfRows ?? 100),
    pageNo: String(params.pageNo ?? 1),
    arrange: "O", // 대표이미지 있는 것 우선
  };
  if (params.sigunguCode !== undefined) req.sigunguCode = String(params.sigunguCode);

  const json = await ktoRequest<AreaBasedResponse>("areaBasedList2", req, options);
  return asArray(json.response?.body?.items?.item).map((r) => ({
    contentId: r.contentid ?? "",
    contentTypeId: r.contenttypeid ?? "",
    title: r.title ?? "",
    addr: r.addr1 ?? null,
    lat: toNum(r.mapy),
    lng: toNum(r.mapx),
    firstImage: r.firstimage || null,
  }));
}

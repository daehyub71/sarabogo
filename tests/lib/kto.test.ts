import { afterEach, describe, expect, it, vi } from "vitest";
import { ktoRequest, KtoError } from "@/lib/kto";

/**
 * lib/kto.ts 계약 테스트.
 *
 * 핵심 불변식: 모든 관광공사 요청에 앱 식별자 MobileApp=sarabogo와 serviceKey가 붙는다.
 * ⚠️ TourAPI에 `AppName` 파라미터는 존재하지 않는다 — 보내면 API가 거부한다
 *    (resultCode 10). 앱 이름은 MobileApp으로 전달한다. 실호출로 확인함.
 */

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const OK_BODY = {
  response: { header: { resultCode: "0000" }, body: { items: { item: [] } } },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ktoRequest", () => {
  it("모든 요청에 앱 식별자 MobileApp=sarabogo를 부착한다", async () => {
    const fetchMock = mockFetchOnce(OK_BODY);
    await ktoRequest("areaCode2", { numOfRows: "10" }, { serviceKey: "K" });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("MobileApp")).toBe("sarabogo");
  });

  it("AppName 파라미터를 절대 보내지 않는다 (API가 거부함 · resultCode 10)", async () => {
    const fetchMock = mockFetchOnce(OK_BODY);
    await ktoRequest("areaCode2", {}, { serviceKey: "K" });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.has("AppName")).toBe(false);
  });

  it("serviceKey와 공통 파라미터(MobileOS, _type)를 부착한다", async () => {
    const fetchMock = mockFetchOnce(OK_BODY);
    await ktoRequest("areaCode2", {}, { serviceKey: "MY_KEY" });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("serviceKey")).toBe("MY_KEY");
    expect(calledUrl.searchParams.get("MobileOS")).toBeTruthy();
    expect(calledUrl.searchParams.get("_type")).toBe("json");
  });

  it("호출자가 넘긴 파라미터를 병합한다", async () => {
    const fetchMock = mockFetchOnce(OK_BODY);
    await ktoRequest("areaBasedList2", { areaCode: "3", numOfRows: "20" }, { serviceKey: "K" });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("areaCode")).toBe("3");
    expect(calledUrl.searchParams.get("numOfRows")).toBe("20");
  });

  it("호출자가 넘긴 AppName은 제거된다 (API 400 방어)", async () => {
    const fetchMock = mockFetchOnce(OK_BODY);
    await ktoRequest("areaCode2", { AppName: "hacker" }, { serviceKey: "K" });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.has("AppName")).toBe(false);
    expect(calledUrl.searchParams.get("MobileApp")).toBe("sarabogo");
  });

  it("호출자는 MobileApp을 덮어쓸 수 없다", async () => {
    const fetchMock = mockFetchOnce(OK_BODY);
    await ktoRequest("areaCode2", { MobileApp: "hacker" }, { serviceKey: "K" });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("MobileApp")).toBe("sarabogo");
  });

  it("평평한 오류 응답(KorService2 실제 형태)도 KtoError로 변환한다", async () => {
    // 성공은 중첩(response.header), 오류는 평평하다. 중첩만 보면 오류를 성공으로 오인한다.
    mockFetchOnce({
      responseTime: "2026-07-12T14:58:53.977",
      resultCode: "10",
      resultMsg: "INVALID_REQUEST_PARAMETER_ERROR(AppName)",
    });
    await expect(
      ktoRequest("areaCode2", {}, { serviceKey: "K", retries: 0 }),
    ).rejects.toBeInstanceOf(KtoError);
  });

  it("HTTP 오류 시 KtoError를 던진다", async () => {
    mockFetchOnce("Service Unavailable", false, 503);
    await expect(
      ktoRequest("areaCode2", {}, { serviceKey: "K", retries: 0 }),
    ).rejects.toBeInstanceOf(KtoError);
  });

  it("관광공사 오류 resultCode를 KtoError로 변환한다", async () => {
    mockFetchOnce({
      response: { header: { resultCode: "22", resultMsg: "LIMITED_NUMBER_OF_SERVICE_REQUESTS" } },
    });
    await expect(
      ktoRequest("areaCode2", {}, { serviceKey: "K", retries: 0 }),
    ).rejects.toBeInstanceOf(KtoError);
  });
});

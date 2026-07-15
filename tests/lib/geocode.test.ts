import { describe, expect, it, vi, afterEach } from "vitest";
import { createTableGeocoder } from "@/lib/geocode/adapters/table";
import { createKakaoGeocoder } from "@/lib/geocode/adapters/kakao";

/**
 * 지오코딩 어댑터 테스트. 카카오 승인 전에도 fallback으로 개발이 막히지 않음을 증명.
 */

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("table 지오코더 (fallback)", () => {
  const geo = createTableGeocoder({
    "충남 보령시 대해로 604": { lat: 36.33, lng: 126.61, address: "충남 보령시 대해로 604" },
  });

  it("완전일치 주소를 좌표로 변환한다", async () => {
    const p = await geo.geocode("충남 보령시 대해로 604");
    expect(p?.lat).toBeCloseTo(36.33);
  });

  it("정규 주소가 쿼리에 포함되면 매칭한다 (표기 흔들림 대응)", async () => {
    // 안전을 위해 한쪽이 다른 쪽을 온전히 포함할 때만 매칭한다(퍼지 매칭 금지 — 좌표 오류 방지).
    const p = await geo.geocode("충남 보령시 대해로 604 신흑동");
    expect(p).not.toBeNull();
  });

  it("없으면 null을 반환한다 (보정 큐로 넘어감)", async () => {
    expect(await geo.geocode("서울시 어딘가")).toBeNull();
  });
});

describe("kakao 지오코더", () => {
  it("주소 검색 결과를 GeoPoint로 변환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          documents: [{ x: "126.62", y: "36.38", road_address_name: "충남 보령시 죽성로 136" }],
        }),
      }),
    );
    const geo = createKakaoGeocoder({ apiKey: "K" });
    const p = await geo.geocode("보령아산병원");
    expect(p).toEqual({ lat: 36.38, lng: 126.62, address: "충남 보령시 죽성로 136" });
  });

  it("주소 검색이 비면 키워드 검색으로 폴백한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ documents: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ documents: [{ x: "127.0", y: "37.0", place_name: "하나로마트" }] }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const geo = createKakaoGeocoder({ apiKey: "K" });
    const p = await geo.geocode("보령 마트");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(p?.address).toBe("하나로마트");
  });

  it("Authorization 헤더에 KakaoAK 키를 담는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ documents: [{ x: "1", y: "2" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await createKakaoGeocoder({ apiKey: "MYKEY" }).geocode("x");
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("KakaoAK MYKEY");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { collectRegion, type RegionTarget } from "@/lib/collect";
import type { CollectWriter } from "@/lib/collect/adapters/supabase-writer";

/**
 * 수집 오케스트레이션 테스트 — 외부 API를 mock하고, writer는 페이크로 캡처한다.
 * 심평원 병원·약국 좌표가 그대로 places로 흐르는지, source별 교체가 호출되는지 검증.
 */

function mockFetchSequence(bodies: unknown[]) {
  const fetchMock = vi.fn();
  for (const b of bodies) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => b,
      text: async () => (typeof b === "string" ? b : JSON.stringify(b)),
    });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const TARGET: RegionTarget = {
  regionId: "region-1",
  name: "충남 보령시",
  ktoAreaCode: 34,
  ktoSigunguCode: 5,
  hiraSidoCd: "340000",
  hiraSgguCd: "340400",
};

const HOSPITAL_XML =
  `<response><header><resultCode>00</resultCode></header><body><items>` +
  `<item><yadmNm>보령아산병원</yadmNm><clCdNm>종합병원</clCdNm><addr>보령시 죽성로 136</addr>` +
  `<telno>041-930-5114</telno><XPos>126.6228</XPos><YPos>36.3811</YPos>` +
  `<sidoCdNm>충남</sidoCdNm><sgguCdNm>보령시</sgguCdNm><ykiho>ABC</ykiho></item></items></body></response>`;
const PHARMACY_XML =
  `<response><header><resultCode>00</resultCode></header><body><items>` +
  `<item><yadmNm>오약국</yadmNm><clCdNm>약국</clCdNm><addr>보령시 흥덕로 22</addr>` +
  `<XPos>126.6032</XPos><YPos>36.3402</YPos></item></items></body></response>`;
const TOUR_JSON = {
  response: {
    body: {
      items: {
        item: {
          contentid: "301",
          contenttypeid: "12",
          title: "대천해수욕장",
          addr1: "보령시 신흑동",
          mapx: "126.5",
          mapy: "36.31",
          firstimage: "https://x/y.jpg",
        },
      },
    },
  },
};
const STAY_JSON = { response: { body: { items: { item: [] } } } };

function fakeWriter() {
  const calls: { region: string; source: string; count: number }[] = [];
  const writer: CollectWriter = {
    async replacePlaces(regionId, source, places) {
      calls.push({ region: regionId, source, count: places.length });
      return places.length;
    },
    async updateRegionCounts() {
      return { hospital: 1, pharmacy: 1 };
    },
  };
  return { writer, calls };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("collectRegion", () => {
  it("심평원+관광공사를 모아 source별로 교체 적재한다", async () => {
    // Promise.all 순서: hira 병원, hira 약국, kto 관광지, kto 숙박
    mockFetchSequence([HOSPITAL_XML, PHARMACY_XML, TOUR_JSON, STAY_JSON]);
    const { writer, calls } = fakeWriter();

    const r = await collectRegion(TARGET, { serviceKey: "K", writer });

    expect(r.hospitals).toBe(1);
    expect(r.pharmacies).toBe(1);
    expect(r.tours).toBe(1);
    expect(r.stays).toBe(0);

    // hira 2건(병원+약국), kto 1건(관광지) 교체
    const hira = calls.find((c) => c.source === "hira");
    const kto = calls.find((c) => c.source === "kto");
    expect(hira?.count).toBe(2);
    expect(kto?.count).toBe(1);
  });

  it("regions 집계 갱신 결과를 반환한다", async () => {
    mockFetchSequence([HOSPITAL_XML, PHARMACY_XML, TOUR_JSON, STAY_JSON]);
    const { writer } = fakeWriter();
    const r = await collectRegion(TARGET, { serviceKey: "K", writer });
    expect(r.counts).toEqual({ hospital: 1, pharmacy: 1 });
  });
});

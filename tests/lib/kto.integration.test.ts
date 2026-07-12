import { describe, expect, it } from "vitest";
import { ktoRequest } from "@/lib/kto";

/**
 * 관광공사 실 API 통합 테스트.
 *
 * 실키가 있을 때만 실행한다(없으면 skip). lib/kto.ts를 그대로 통과시켜
 * AppName 주입 · Decoding 키 처리 · 응답 파싱이 실제로 동작하는지 검증한다.
 *
 * 실행: TOUR_API_KEY=... npx vitest run tests/lib/kto.integration.test.ts
 */
const serviceKey = process.env.TOUR_API_KEY;
const enabled = Boolean(serviceKey);

interface AreaCodeResponse {
  response: {
    body: {
      items: { item: Array<{ code: string; name: string }> };
    };
  };
}

describe.skipIf(!enabled)("kto (integration · 실 API)", () => {
  it("areaCode2로 지역코드 목록을 받아온다", async () => {
    const res = await ktoRequest<AreaCodeResponse>(
      "areaCode2",
      { numOfRows: "20", pageNo: "1" },
      { serviceKey: serviceKey! },
    );

    const items = res.response.body.items.item;
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);

    // 서울(1)은 항상 존재한다.
    const names = items.map((i) => i.name);
    expect(names).toContain("서울");
  }, 20_000);
});

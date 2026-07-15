import { describe, expect, it } from "vitest";
import { fetchHospitals } from "@/lib/hira";

/**
 * 심평원 실 API 통합 테스트. HIRA_API_KEY가 있을 때만 실행.
 * 실행: set -a && . ./.env && set +a && npx vitest run tests/lib/hira.integration.test.ts
 */
const serviceKey = process.env.HIRA_API_KEY;

describe.skipIf(!serviceKey)("hira (integration · 실 API)", () => {
  it("보령시 병원을 좌표와 함께 받아온다", async () => {
    const list = await fetchHospitals({
      serviceKey: serviceKey!,
      sidoCd: "340000",
      sgguCd: "340400",
      numOfRows: 3,
    });
    expect(list.length).toBeGreaterThan(0);
    const h = list[0];
    expect(h.name).toBeTruthy();
    // 핵심: 좌표가 직접 온다 (지오코딩 불필요).
    expect(h.lat).not.toBeNull();
    expect(h.lng).not.toBeNull();
    expect(h.lat!).toBeGreaterThan(33);
    expect(h.lat!).toBeLessThan(39);
  }, 20_000);
});

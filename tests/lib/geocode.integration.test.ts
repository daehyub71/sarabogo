import { describe, expect, it } from "vitest";
import { createKakaoGeocoder } from "@/lib/geocode/adapters/kakao";

/**
 * 카카오 지오코딩 실 API 통합 테스트.
 *
 * KAKAO_REST_API_KEY가 있어도, 카카오맵 제품 승인 전에는 403이 나므로 skip 처리한다.
 * 승인되면 이 테스트가 통과한다 — 그때 `node scripts/check-keys.mjs`로 먼저 확인하고 돌린다.
 *
 * 실행: RUN_KAKAO=1 set -a && . ./.env && set +a && npx vitest run tests/lib/geocode.integration.test.ts
 */
const enabled = Boolean(process.env.KAKAO_REST_API_KEY) && process.env.RUN_KAKAO === "1";

describe.skipIf(!enabled)("kakao geocode (integration · 승인 후)", () => {
  it("병원 주소를 좌표로 변환한다", async () => {
    const geo = createKakaoGeocoder();
    const p = await geo.geocode("충청남도 보령시 죽성로 136");
    expect(p).not.toBeNull();
    expect(p!.lat).toBeGreaterThan(33);
    expect(p!.lat).toBeLessThan(39);
  }, 20_000);
});

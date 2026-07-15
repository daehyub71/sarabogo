import { describe, expect, it } from "vitest";
import type { DbPort } from "@/lib/db/port";
import type { NewReview, Region, Review } from "@/types/domain";

/**
 * DbPort 계약 테스트 — 어댑터에 무관하게 성립해야 하는 동작.
 *
 * 같은 스위트를 memory·supabase 어댑터 양쪽에 돌린다. 둘 다 통과해야
 * "DB 교체 가능"이 말이 아니라 사실이 된다 (CLAUDE.md 교체 가능성, R12).
 *
 * ⚠️ 실 DB가 가르쳐준 제약 (2026-07-12):
 *   - id 컬럼은 uuid다 → fixture는 유효 UUID를 쓴다(문자열 "region-1" 불가).
 *   - reviews.author_id/verified_by는 profiles FK → 사용자 후기는 실제 프로필이 필요하다.
 *     프로필 FK가 필요한 사용자 후기 케이스는 authz.test.ts(memory)에서 다루고,
 *     여기서는 FK 없는 시딩 후기(author 없음)로 계약을 검증한다.
 *   - public_doc은 verified_at 없이 저장 불가(CHECK). 미검수 케이스는 interview로 만든다.
 */

const REGION_ID = "11111111-1111-1111-1111-111111111111";
const REVIEW_ID = "22222222-2222-2222-2222-222222222222";
const UNVERIFIED_ID = "33333333-3333-3333-3333-333333333333";
const MISSING_ID = "99999999-9999-9999-9999-999999999999";

const REGION: Region = {
  id: REGION_ID,
  areaCode: 34,
  sigunguCode: 11,
  name: "충남 보령시",
  lat: 36.33,
  lng: 126.61,
  hospitalCount: 5,
  pharmacyCount: 8,
  avgMonthlyCost: 82,
};

/** 검수된 공공저작물 후기 — FK 없음(author/verified_by null), CHECK 충족. */
function seedReview(over: Partial<Review> = {}): Review {
  return {
    id: REVIEW_ID,
    regionId: REGION_ID,
    origin: "public_doc",
    authorId: null,
    medicalAccess: 4,
    loneliness: null, // 원문 근거 없음 → null 유지
    transport: 3,
    revisit: null,
    monthlyCost: 78,
    summary: "보령시 결과보고서 발췌",
    tags: ["바다", "조용함"],
    sourceOrg: "보령시",
    sourceYear: 2025,
    sourceTitle: "2025 한달살기 결과보고서",
    sourceUrl: "https://example.gov/boryeong-2025",
    sourceDomain: "example.gov",
    sourceLicense: "KOGL-1",
    consentDocUrl: null,
    extractedBy: "llm",
    verifiedBy: null,
    verifiedAt: new Date(0).toISOString(),
    createdAt: new Date(0).toISOString(),
    ...over,
  };
}

export type MakeDb = (seed: {
  regions?: Region[];
  reviews?: Review[];
}) => Promise<DbPort> | DbPort;

export function runDbContract(adapterName: string, makeDb: MakeDb) {
  describe(`DbPort 계약 · ${adapterName}`, () => {
    it("지역을 id로 조회한다", async () => {
      const db = await makeDb({ regions: [REGION] });
      expect(await db.getRegion(REGION_ID)).toMatchObject({ name: "충남 보령시" });
      expect(await db.getRegion(MISSING_ID)).toBeNull();
    });

    it("검수된 시딩 후기는 공개 목록에 포함된다", async () => {
      const db = await makeDb({ regions: [REGION], reviews: [seedReview()] });
      const list = await db.listPublicReviewsByRegion(REGION_ID);
      expect(list).toHaveLength(1);
    });

    it("미검수 시딩 후기는 공개 목록에서 제외된다 (FR-2.6)", async () => {
      // public_doc은 CHECK 때문에 미검수로 저장 불가 → interview로 미검수 상태를 만든다.
      const db = await makeDb({
        regions: [REGION],
        reviews: [
          seedReview({
            id: UNVERIFIED_ID,
            origin: "interview",
            sourceOrg: null,
            sourceYear: null,
            sourceTitle: null,
            sourceUrl: null,
            sourceDomain: null,
            sourceLicense: null,
            extractedBy: null,
            verifiedAt: null,
          }),
        ],
      });
      const list = await db.listPublicReviewsByRegion(REGION_ID);
      expect(list).toHaveLength(0);
    });

    it("null 별점을 0으로 바꾸지 않고 그대로 보존한다", async () => {
      const db = await makeDb({ regions: [REGION], reviews: [seedReview()] });
      const [r] = await db.listPublicReviewsByRegion(REGION_ID);
      expect(r.loneliness).toBeNull();
      expect(r.revisit).toBeNull();
      expect(r.medicalAccess).toBe(4);
    });

    it("시딩 후기를 생성하고 다시 조회할 수 있다", async () => {
      const db = await makeDb({ regions: [REGION] });
      const input: NewReview = {
        regionId: REGION_ID,
        origin: "public_doc",
        authorId: null,
        medicalAccess: 5,
        loneliness: 2,
        transport: 4,
        revisit: 5,
        monthlyCost: 90,
        summary: "발췌 요약",
        tags: ["의료좋음"],
        sourceOrg: "강진군",
        sourceYear: 2024,
        sourceTitle: "강진 한달살기 수기",
        sourceUrl: "https://example.gov/gangjin-2024",
        sourceDomain: "example.gov",
        sourceLicense: "KOGL-1",
        consentDocUrl: null,
        extractedBy: "llm",
        verifiedBy: null,
        verifiedAt: new Date(0).toISOString(),
      };
      const created = await db.createReview(input);
      expect(created.id).toBeTruthy();
      expect(await db.getReview(created.id)).toMatchObject({ summary: "발췌 요약" });
    });

    it("후기를 수정·삭제한다", async () => {
      const db = await makeDb({ regions: [REGION], reviews: [seedReview()] });
      const patched = await db.updateReview(REVIEW_ID, { transport: 5 });
      expect(patched.transport).toBe(5);
      await db.deleteReview(REVIEW_ID);
      expect(await db.getReview(REVIEW_ID)).toBeNull();
    });
  });
}

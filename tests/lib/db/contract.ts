import { describe, expect, it } from "vitest";
import type { DbPort } from "@/lib/db/port";
import type { NewReview, Region, Review } from "@/types/domain";

/**
 * DbPort 계약 테스트 — 어댑터에 무관하게 성립해야 하는 동작.
 *
 * 같은 스위트를 memory·supabase 어댑터 양쪽에 돌린다. 둘 다 통과해야
 * "DB 교체 가능"이 말이 아니라 사실이 된다 (CLAUDE.md 교체 가능성, R12).
 *
 * makeDb는 시드 데이터를 받아 어댑터 인스턴스를 만든다.
 */

const REGION: Region = {
  id: "region-1",
  areaCode: 34,
  sigunguCode: 11,
  name: "충남 보령시",
  lat: 36.33,
  lng: 126.61,
  hospitalCount: 5,
  pharmacyCount: 8,
  avgMonthlyCost: 82,
};

function baseReview(over: Partial<Review> = {}): Review {
  return {
    id: "seed-review-1",
    regionId: "region-1",
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
    verifiedBy: "admin-1",
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
      expect(await db.getRegion("region-1")).toMatchObject({ name: "충남 보령시" });
      expect(await db.getRegion("nope")).toBeNull();
    });

    it("검수된 시딩 후기는 공개 목록에 포함된다", async () => {
      const db = await makeDb({ regions: [REGION], reviews: [baseReview()] });
      const list = await db.listPublicReviewsByRegion("region-1");
      expect(list).toHaveLength(1);
    });

    it("미검수 시딩 후기는 공개 목록에서 제외된다 (FR-2.6)", async () => {
      const db = await makeDb({
        regions: [REGION],
        reviews: [baseReview({ id: "unverified", verifiedAt: null, verifiedBy: null })],
      });
      const list = await db.listPublicReviewsByRegion("region-1");
      expect(list).toHaveLength(0);
    });

    it("사용자 후기는 검수 없이도 공개된다", async () => {
      const db = await makeDb({
        regions: [REGION],
        reviews: [
          baseReview({
            id: "user-review",
            origin: "user",
            authorId: "user-1",
            sourceLicense: null,
            verifiedAt: null,
            verifiedBy: null,
          }),
        ],
      });
      const list = await db.listPublicReviewsByRegion("region-1");
      expect(list.map((r) => r.id)).toContain("user-review");
    });

    it("null 별점을 0으로 바꾸지 않고 그대로 보존한다", async () => {
      const db = await makeDb({ regions: [REGION], reviews: [baseReview()] });
      const [r] = await db.listPublicReviewsByRegion("region-1");
      expect(r.loneliness).toBeNull();
      expect(r.revisit).toBeNull();
      expect(r.medicalAccess).toBe(4);
    });

    it("후기를 생성하고 다시 조회할 수 있다", async () => {
      const db = await makeDb({ regions: [REGION] });
      const input: NewReview = {
        regionId: "region-1",
        origin: "user",
        authorId: "user-1",
        medicalAccess: 5,
        loneliness: 2,
        transport: 4,
        revisit: 5,
        monthlyCost: 90,
        summary: "직접 살아본 후기",
        tags: ["의료좋음"],
        sourceOrg: null,
        sourceYear: null,
        sourceTitle: null,
        sourceUrl: null,
        sourceDomain: null,
        sourceLicense: null,
        consentDocUrl: null,
        extractedBy: null,
        verifiedBy: null,
        verifiedAt: null,
      };
      const created = await db.createReview(input);
      expect(created.id).toBeTruthy();
      expect(await db.getReview(created.id)).toMatchObject({ summary: "직접 살아본 후기" });
    });

    it("후기를 수정·삭제한다", async () => {
      const db = await makeDb({ regions: [REGION], reviews: [baseReview()] });
      const patched = await db.updateReview("seed-review-1", { transport: 5 });
      expect(patched.transport).toBe(5);
      await db.deleteReview("seed-review-1");
      expect(await db.getReview("seed-review-1")).toBeNull();
    });
  });
}

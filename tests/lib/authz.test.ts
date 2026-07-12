import { describe, expect, it } from "vitest";
import { createMemoryDb } from "@/lib/db/adapters/memory";
import {
  ANON,
  AuthzError,
  canAccessAdmin,
  canCreateReview,
  canModifyReview,
  type Actor,
} from "@/lib/authz";
import { createReview, deleteReview, updateReview } from "@/lib/reviews";
import type { NewReview, Review } from "@/types/domain";

/**
 * 인가 계층 테스트 — DB 추상화의 대가(R11).
 * 핵심: 타인 후기 write 차단이 memory 어댑터에서도 성립한다 (RLS에 기대지 않음).
 */

const alice: Actor = { id: "user-alice", role: "user" };
const bob: Actor = { id: "user-bob", role: "user" };
const admin: Actor = { id: "admin-1", role: "admin" };

function userReviewBy(authorId: string, id = "r-1"): Review {
  return {
    id,
    regionId: "region-1",
    origin: "user",
    authorId,
    medicalAccess: 4,
    loneliness: 3,
    transport: 4,
    revisit: 5,
    monthlyCost: 85,
    summary: "살아본 후기",
    tags: [],
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
    createdAt: new Date(0).toISOString(),
  };
}

function newUserReview(authorId: string): NewReview {
  // NewReview = Review에서 id·createdAt 제외.
  const { id: _id, createdAt: _createdAt, ...rest } = userReviewBy(authorId);
  void _id;
  void _createdAt;
  return rest;
}

describe("인가 순수 규칙", () => {
  it("비로그인은 후기를 쓸 수 없다", () => {
    expect(canCreateReview(ANON, newUserReview("user-alice"))).toBe(false);
  });

  it("사용자는 본인 명의로만 후기를 쓴다", () => {
    expect(canCreateReview(alice, newUserReview("user-alice"))).toBe(true);
    expect(canCreateReview(alice, newUserReview("user-bob"))).toBe(false);
  });

  it("시딩 후기(public_doc)는 관리자만 입력한다", () => {
    const seed = { ...newUserReview("x"), origin: "public_doc", authorId: null } as NewReview;
    expect(canCreateReview(alice, seed)).toBe(false);
    expect(canCreateReview(admin, seed)).toBe(true);
  });

  it("타인 사용자 후기는 수정할 수 없고, 본인·관리자는 가능하다", () => {
    const review = userReviewBy("user-alice");
    expect(canModifyReview(bob, review)).toBe(false);
    expect(canModifyReview(alice, review)).toBe(true);
    expect(canModifyReview(admin, review)).toBe(true);
  });

  it("관리자 콘솔은 admin만", () => {
    expect(canAccessAdmin(alice)).toBe(false);
    expect(canAccessAdmin(admin)).toBe(true);
  });
});

describe("후기 서비스 (memory 어댑터 + 인가)", () => {
  it("타인이 내 후기를 수정하면 AuthzError로 막는다", async () => {
    const db = createMemoryDb({ reviews: [userReviewBy("user-alice", "r-1")] });
    await expect(updateReview(db, bob, "r-1", { transport: 1 })).rejects.toBeInstanceOf(
      AuthzError,
    );
    // 원본은 그대로여야 한다.
    expect((await db.getReview("r-1"))?.transport).toBe(4);
  });

  it("본인은 자기 후기를 수정할 수 있다", async () => {
    const db = createMemoryDb({ reviews: [userReviewBy("user-alice", "r-1")] });
    const updated = await updateReview(db, alice, "r-1", { transport: 2 });
    expect(updated.transport).toBe(2);
  });

  it("타인이 내 후기를 삭제하면 막고, 원본이 남는다", async () => {
    const db = createMemoryDb({ reviews: [userReviewBy("user-alice", "r-1")] });
    await expect(deleteReview(db, bob, "r-1")).rejects.toBeInstanceOf(AuthzError);
    expect(await db.getReview("r-1")).not.toBeNull();
  });

  it("일반 사용자는 시딩 후기를 수정할 수 없다", async () => {
    const seed = { ...userReviewBy("x", "seed-1"), origin: "public_doc", authorId: null } as Review;
    const db = createMemoryDb({ reviews: [seed] });
    await expect(updateReview(db, alice, "seed-1", { transport: 1 })).rejects.toBeInstanceOf(
      AuthzError,
    );
  });

  it("비로그인 생성은 거부된다", async () => {
    const db = createMemoryDb({});
    await expect(createReview(db, ANON, newUserReview("user-alice"))).rejects.toBeInstanceOf(
      AuthzError,
    );
  });
});

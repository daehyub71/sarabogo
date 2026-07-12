/**
 * DbPort — 데이터 접근의 유일한 경계.
 *
 * 화면·API·인가는 이 인터페이스만 안다. 구현(어댑터)은 lib/db/adapters/에 있다.
 * 시그니처에는 도메인 타입(types/domain)만 등장한다. Supabase 등 벤더 타입을
 * 노출하지 않는다 (CLAUDE.md C-6). 노출하는 순간 추상화는 장식이 된다.
 */
import type {
  Course,
  NewReview,
  Profile,
  Region,
  Review,
} from "@/types/domain";

/** 후기에 부분 수정을 적용하는 패치(구조화 별점·서술·태그 등). */
export type ReviewPatch = Partial<
  Pick<
    Review,
    | "medicalAccess"
    | "loneliness"
    | "transport"
    | "revisit"
    | "monthlyCost"
    | "summary"
    | "tags"
    | "verifiedBy"
    | "verifiedAt"
  >
>;

export interface DbPort {
  // ── 지역 ────────────────────────────────
  listRegions(): Promise<Region[]>;
  getRegion(id: string): Promise<Region | null>;

  // ── 후기 ────────────────────────────────
  /**
   * 지역의 공개 후기만 반환한다.
   * 공개 기준: origin='user' 또는 verifiedAt != null (검수 완료).
   * 미검수 시딩 후기는 절대 포함하지 않는다 (FR-2.6).
   */
  listPublicReviewsByRegion(regionId: string): Promise<Review[]>;
  getReview(id: string): Promise<Review | null>;
  createReview(review: NewReview): Promise<Review>;
  updateReview(id: string, patch: ReviewPatch): Promise<Review>;
  deleteReview(id: string): Promise<void>;

  // ── 코스 ────────────────────────────────
  listCoursesByRegion(regionId: string): Promise<Course[]>;

  // ── 프로필 ──────────────────────────────
  getProfile(id: string): Promise<Profile | null>;
}

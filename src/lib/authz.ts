/**
 * 인가(authorization) — 애플리케이션 레이어의 1차 경계.
 *
 * DB를 포트+어댑터로 추상화하면 Supabase RLS를 유일 경계로 쓸 수 없다.
 * 그래서 인가를 여기서 명시적으로 검사한다. RLS는 심층 방어(2차)로 남는다.
 * 이 모듈은 순수하다 — DB·벤더에 의존하지 않으므로 어댑터를 갈아끼워도 그대로 통과한다.
 */
import type { NewReview, Review } from "@/types/domain";

/** 요청 주체. 비로그인은 id=null. */
export interface Actor {
  id: string | null;
  role: "anon" | "user" | "admin";
}

export const ANON: Actor = { id: null, role: "anon" };

/** 인가 거부. Route Handler에서 403으로 변환한다. */
export class AuthzError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthzError";
  }
}

/** 사용자가 직접 쓴 후기인지. */
function isUserReview(r: Pick<Review, "origin">): boolean {
  return r.origin === "user";
}

/** 관리자만 다루는 시딩 후기인지(public_doc/licensed/curated/interview/editor). */
function isSeedReview(r: Pick<Review, "origin">): boolean {
  return !isUserReview(r);
}

// ── 후기 생성 ────────────────────────────────
export function canCreateReview(actor: Actor, input: NewReview): boolean {
  if (isSeedReview(input)) {
    // 시딩 후기는 관리자만 입력한다 (관리자 콘솔 경유).
    return actor.role === "admin";
  }
  // 사용자 후기: 로그인 필요 + 작성자는 본인이어야 한다.
  return actor.role !== "anon" && actor.id !== null && actor.id === input.authorId;
}

export function assertCanCreateReview(actor: Actor, input: NewReview): void {
  if (!canCreateReview(actor, input)) {
    throw new AuthzError("후기를 작성할 권한이 없다");
  }
}

// ── 후기 수정·삭제 ───────────────────────────
export function canModifyReview(actor: Actor, review: Review): boolean {
  if (actor.role === "admin") return true; // 관리자는 검수·정정 가능
  if (isSeedReview(review)) return false; // 시딩 후기는 일반 사용자가 손대지 못한다
  // 사용자 후기는 작성자 본인만.
  return actor.id !== null && actor.id === review.authorId;
}

export function assertCanModifyReview(actor: Actor, review: Review): void {
  if (!canModifyReview(actor, review)) {
    throw new AuthzError("이 후기를 수정·삭제할 권한이 없다");
  }
}

// ── 관리자 콘솔 ──────────────────────────────
export function canAccessAdmin(actor: Actor): boolean {
  return actor.role === "admin";
}

export function assertAdmin(actor: Actor): void {
  if (!canAccessAdmin(actor)) {
    throw new AuthzError("관리자 전용 기능이다");
  }
}

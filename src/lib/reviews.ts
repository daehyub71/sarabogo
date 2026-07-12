/**
 * 후기 쓰기 서비스 — 인가(authz)와 DbPort를 결합한 실제 경계.
 *
 * Route Handler는 DB를 직접 만지지 않고 이 함수를 부른다. 여기서 인가를 먼저 검사한다.
 * DbPort를 주입받으므로 어댑터(memory/supabase)와 무관하게 같은 인가가 성립한다 (R11).
 */
import type { DbPort, ReviewPatch } from "@/lib/db/port";
import type { NewReview, Review } from "@/types/domain";
import { type Actor, assertCanCreateReview, assertCanModifyReview } from "@/lib/authz";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export async function createReview(
  db: DbPort,
  actor: Actor,
  input: NewReview,
): Promise<Review> {
  assertCanCreateReview(actor, input);
  return db.createReview(input);
}

export async function updateReview(
  db: DbPort,
  actor: Actor,
  id: string,
  patch: ReviewPatch,
): Promise<Review> {
  const existing = await db.getReview(id);
  if (!existing) throw new NotFoundError(`후기를 찾을 수 없다: ${id}`);
  assertCanModifyReview(actor, existing);
  return db.updateReview(id, patch);
}

export async function deleteReview(
  db: DbPort,
  actor: Actor,
  id: string,
): Promise<void> {
  const existing = await db.getReview(id);
  if (!existing) throw new NotFoundError(`후기를 찾을 수 없다: ${id}`);
  assertCanModifyReview(actor, existing);
  await db.deleteReview(id);
}

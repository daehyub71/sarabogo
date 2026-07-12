/**
 * LlmPort — AI 추천의 유일한 경계.
 *
 * 공급자(Claude/OpenAI)는 어댑터로 교체한다 (env LLM_PROVIDER). 기본값은 Claude.
 * 응답은 반드시 Zod 스키마로 검증한다 — 이것이 환각 방어의 핵심이다 (SPEC FR-3.3, R4).
 * 근거 후기 id는 이 계층에서 형식만 보장하고, DB 실존 여부는 서버가 별도 검증한다.
 */
import { z } from "zod";
import type { Review } from "@/types/domain";

/** 추천 조건 입력. */
export interface RecommendInput {
  /** 예산(만원). */
  budget: number;
  /** 건강 배려 필요 여부. */
  needsHealthcare: boolean;
  /** 관심사 태그. */
  interests: string[];
  /** RAG 근거: DB에서 조회한 구조화 후기. LLM은 이 안에서만 추천한다. */
  reviewContext: Review[];
  /** RAG 근거: 관광공사 관광정보(자유형). */
  tourContext: unknown;
}

/**
 * LLM 응답 스키마. 모델이 반드시 이 형태의 JSON을 반환해야 한다.
 * 위반 시 어댑터가 1회 재시도하고, 그래도 실패하면 던진다 (호출측이 에디터 코스로 폴백).
 */
export const courseDraftSchema = z.object({
  title: z.string().min(1),
  weeks: z
    .array(
      z.object({
        week: z.number().int().min(1).max(4),
        plan: z.string().min(1),
      }),
    )
    .length(4),
  /** 각 추천이 근거로 삼은 후기 id. 빈 배열이면 근거 없는 추천 → 거부 대상. */
  basedOnReviewIds: z.array(z.string()).min(1),
});

export type CourseDraft = z.infer<typeof courseDraftSchema>;

export interface LlmPort {
  /**
   * 조건과 근거(후기+관광정보)로 4주차 코스를 생성한다.
   * @throws 스키마 검증에 반복 실패하면 오류를 던진다.
   */
  generateCourse(input: RecommendInput): Promise<CourseDraft>;
}

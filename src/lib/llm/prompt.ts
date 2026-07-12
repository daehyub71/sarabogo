/**
 * 프롬프트 구성·응답 파싱 — 공급자 무관 공유 로직.
 * 벤더 SDK를 import하지 않으므로 어댑터가 아니다.
 */
import { courseDraftSchema, type CourseDraft, type RecommendInput } from "@/lib/llm/port";

export const SYSTEM_PROMPT =
  "너는 시니어 한달살기 코디네이터다. 반드시 제공된 후기와 관광정보 '근거' 안에서만 추천하라. " +
  "근거에 없는 사실을 지어내지 말고, 각 추천이 참조한 후기 id를 basedOnReviewIds에 담아라. " +
  "응답은 JSON 객체 하나만 출력한다. 마크다운·설명·코드펜스 없이 순수 JSON만.";

/** 조건과 근거를 사용자 프롬프트로 직렬화한다. */
export function buildUserPrompt(input: RecommendInput): string {
  const reviews = input.reviewContext.map((r) => ({
    id: r.id,
    regionId: r.regionId,
    medicalAccess: r.medicalAccess,
    loneliness: r.loneliness,
    transport: r.transport,
    revisit: r.revisit,
    monthlyCost: r.monthlyCost,
    summary: r.summary,
    tags: r.tags,
  }));

  return [
    `조건: 예산 ${input.budget}만원, 건강배려 ${input.needsHealthcare ? "필요" : "불필요"}, 관심사 ${JSON.stringify(input.interests)}`,
    `후기 근거(JSON): ${JSON.stringify(reviews)}`,
    `관광정보 근거(JSON): ${JSON.stringify(input.tourContext)}`,
    `요구: 4주차 코스를 만들고, 각 근거 후기 id를 basedOnReviewIds에 담아라.`,
    `출력 형식: {"title": string, "weeks": [{"week": 1..4, "plan": string}] (정확히 4개), "basedOnReviewIds": string[]}`,
  ].join("\n");
}

/** 모델 텍스트 응답에서 JSON을 추출해 스키마로 검증한다. 실패 시 throw. */
export function parseCourseDraft(text: string): CourseDraft {
  const json = extractJsonObject(text);
  return courseDraftSchema.parse(json);
}

/** 코드펜스·잡텍스트가 섞여도 첫 번째 JSON 객체를 뽑아낸다. */
function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("LLM 응답에서 JSON 객체를 찾지 못했다");
  }
  return JSON.parse(text.slice(start, end + 1));
}

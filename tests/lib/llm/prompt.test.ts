import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildUserPrompt, parseCourseDraft } from "@/lib/llm/prompt";
import type { RecommendInput } from "@/lib/llm/port";
import type { Review } from "@/types/domain";

/**
 * LLM 응답 파싱·검증 테스트 — 환각 방어의 핵심 (R4).
 * 공급자와 무관하게 이 검증을 통과해야만 추천이 렌더링된다.
 */

function review(id: string): Review {
  return {
    id,
    regionId: "region-1",
    origin: "public_doc",
    authorId: null,
    medicalAccess: 4,
    loneliness: null,
    transport: 3,
    revisit: null,
    monthlyCost: 78,
    summary: "발췌",
    tags: ["바다"],
    sourceOrg: "보령시",
    sourceYear: 2025,
    sourceTitle: "보고서",
    sourceUrl: "https://example.gov/x",
    sourceDomain: "example.gov",
    sourceLicense: "KOGL-1",
    consentDocUrl: null,
    extractedBy: "llm",
    verifiedBy: "admin-1",
    verifiedAt: new Date(0).toISOString(),
    createdAt: new Date(0).toISOString(),
  };
}

const input: RecommendInput = {
  budget: 90,
  needsHealthcare: true,
  interests: ["바다", "조용함"],
  reviewContext: [review("rev-1")],
  tourContext: [{ name: "대천해수욕장" }],
};

function validPayload() {
  return JSON.stringify({
    title: "보령 4주 코스",
    weeks: [1, 2, 3, 4].map((w) => ({ week: w, plan: `${w}주차` })),
    basedOnReviewIds: ["rev-1"],
  });
}

describe("buildUserPrompt", () => {
  it("조건과 근거 후기 id를 프롬프트에 담는다", () => {
    const p = buildUserPrompt(input);
    expect(p).toContain("90만원");
    expect(p).toContain("rev-1");
  });
});

describe("parseCourseDraft", () => {
  it("정상 JSON을 파싱한다", () => {
    const draft = parseCourseDraft(validPayload());
    expect(draft.weeks).toHaveLength(4);
    expect(draft.basedOnReviewIds).toEqual(["rev-1"]);
  });

  it("코드펜스가 섞여 있어도 JSON을 추출한다", () => {
    const draft = parseCourseDraft("```json\n" + validPayload() + "\n```");
    expect(draft.title).toBe("보령 4주 코스");
  });

  it("근거 후기 id가 비면 거부한다 (근거 없는 추천 차단)", () => {
    const bad = JSON.stringify({
      title: "x",
      weeks: [1, 2, 3, 4].map((w) => ({ week: w, plan: "p" })),
      basedOnReviewIds: [],
    });
    expect(() => parseCourseDraft(bad)).toThrow(z.ZodError);
  });

  it("주차가 4개가 아니면 거부한다", () => {
    const bad = JSON.stringify({
      title: "x",
      weeks: [{ week: 1, plan: "p" }],
      basedOnReviewIds: ["rev-1"],
    });
    expect(() => parseCourseDraft(bad)).toThrow(z.ZodError);
  });

  it("JSON이 없으면 오류를 던진다", () => {
    expect(() => parseCourseDraft("죄송합니다, 추천할 수 없습니다.")).toThrow();
  });
});

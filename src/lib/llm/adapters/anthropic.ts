/**
 * Anthropic(Claude) LlmPort 어댑터 — 기본 공급자 (Q1 확정).
 *
 * 벤더 SDK(@anthropic-ai/sdk) import는 이 파일에서만 허용된다 (CLAUDE.md C-5).
 * 스키마 검증 실패 시 1회 재시도하고, 그래도 실패하면 던진다 (R4).
 */
import Anthropic from "@anthropic-ai/sdk";
import type { CourseDraft, LlmPort, RecommendInput } from "@/lib/llm/port";
import { SYSTEM_PROMPT, buildUserPrompt, parseCourseDraft } from "@/lib/llm/prompt";

const DEFAULT_MODEL = "claude-opus-4-8";

export function createAnthropicLlm(opts?: {
  apiKey?: string;
  model?: string;
}): LlmPort {
  const client = new Anthropic({
    apiKey: opts?.apiKey ?? process.env.ANTHROPIC_API_KEY,
  });
  const model = opts?.model ?? DEFAULT_MODEL;

  async function callOnce(input: RecommendInput): Promise<CourseDraft> {
    const res = await client.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return parseCourseDraft(text);
  }

  return {
    async generateCourse(input) {
      try {
        return await callOnce(input);
      } catch {
        // 스키마 위반·JSON 파싱 실패 → 1회 재시도 (R4).
        return callOnce(input);
      }
    },
  };
}

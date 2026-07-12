/**
 * OpenAI(GPT) LlmPort 어댑터 — 대체 공급자.
 *
 * 벤더 SDK(openai) import는 이 파일에서만 허용된다 (CLAUDE.md C-5).
 * LLM_PROVIDER=openai일 때 활성화된다. Claude 어댑터와 동일한 LlmPort 계약을 만족한다.
 */
import OpenAI from "openai";
import type { CourseDraft, LlmPort, RecommendInput } from "@/lib/llm/port";
import { SYSTEM_PROMPT, buildUserPrompt, parseCourseDraft } from "@/lib/llm/prompt";

const DEFAULT_MODEL = "gpt-4o";

export function createOpenAiLlm(opts?: {
  apiKey?: string;
  model?: string;
}): LlmPort {
  const client = new OpenAI({ apiKey: opts?.apiKey ?? process.env.OPENAI_API_KEY });
  const model = opts?.model ?? DEFAULT_MODEL;

  async function callOnce(input: RecommendInput): Promise<CourseDraft> {
    const res = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input) },
      ],
    });
    const text = res.choices[0]?.message?.content ?? "";
    return parseCourseDraft(text);
  }

  return {
    async generateCourse(input) {
      try {
        return await callOnce(input);
      } catch {
        return callOnce(input);
      }
    },
  };
}

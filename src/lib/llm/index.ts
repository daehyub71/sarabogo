/**
 * LlmPort 팩토리 — 공급자 선택의 유일한 진입점.
 *
 * env LLM_PROVIDER 로 어댑터를 고른다. 기본값은 anthropic(Claude, Q1 확정).
 * 바깥 코드는 `import { getLlm } from "@/lib/llm"` 로만 LLM에 접근한다.
 */
import type { LlmPort } from "@/lib/llm/port";
import { createAnthropicLlm } from "@/lib/llm/adapters/anthropic";
import { createOpenAiLlm } from "@/lib/llm/adapters/openai";

let instance: LlmPort | null = null;

export function getLlm(): LlmPort {
  if (instance) return instance;

  const provider = process.env.LLM_PROVIDER ?? "anthropic";
  switch (provider) {
    case "anthropic":
      instance = createAnthropicLlm();
      break;
    case "openai":
      instance = createOpenAiLlm();
      break;
    default:
      throw new Error(`알 수 없는 LLM_PROVIDER: ${provider}`);
  }
  return instance;
}

/** 테스트에서 어댑터(페이크)를 주입하기 위한 훅. */
export function setLlm(llm: LlmPort): void {
  instance = llm;
}

export type { LlmPort, RecommendInput, CourseDraft } from "@/lib/llm/port";

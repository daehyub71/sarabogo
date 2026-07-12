import next from "eslint-config-next";

/**
 * ESLint flat config (ESLint 9 / Next 16).
 *
 * 프로젝트 핵심 규칙: 벤더 SDK는 lib 하위 adapters 디렉토리 안에서만 import
 * 한다 (CLAUDE.md C-5). 이 규칙이 포트+어댑터 추상화를 강제한다. 어기면 CI가 막는다.
 */
export default [
  ...next,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          // "openai"는 정확한 패키지명만 막는다(paths). 로컬 경로가 openai로
          // 끝나도(adapters/openai) 걸리지 않게 한다.
          paths: [
            {
              name: "openai",
              message:
                "벤더 SDK는 lib 하위 adapters 안에서만 import한다 (CLAUDE.md C-5). 포트를 경유하라.",
            },
          ],
          // 스코프 패키지는 하위 경로까지 막는다(patterns). 로컬 @/... 와 충돌하지 않는다.
          patterns: [
            {
              group: ["@supabase/**", "@anthropic-ai/**"],
              message:
                "벤더 SDK는 lib 하위 adapters 안에서만 import한다 (CLAUDE.md C-5). 포트를 경유하라.",
            },
          ],
        },
      ],
    },
  },
  {
    // 어댑터는 벤더 SDK import가 정당하다.
    files: ["src/lib/*/adapters/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

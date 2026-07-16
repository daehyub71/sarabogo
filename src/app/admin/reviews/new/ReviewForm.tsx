"use client";

import { useState } from "react";
import { submitReviewAction } from "./actions";
import type { ReviewOrigin } from "@/types/domain";

/**
 * 후기 시딩 입력 폼 — 정책 게이트.
 * origin을 먼저 고르면 그에 맞는 필드만 렌더된다.
 * ⚠️ curated에는 '원문 붙여넣기' 필드가 아예 없다 — 손으로 하는 크롤링 방지 (CLAUDE.md).
 */
const ORIGINS: { value: ReviewOrigin; label: string; note: string }[] = [
  { value: "public_doc", label: "공공누리 제1유형 발간물", note: "출처 4종 필수 · 제1유형만 저장 가능" },
  { value: "licensed", label: "개별 이용허락", note: "동의서 URL 없이는 저장 불가" },
  { value: "curated", label: "사실 추출(큐레이션)", note: "원문 저장 금지 · 사실만 · 총평 400자 이내" },
  { value: "interview", label: "참가자 인터뷰", note: "본인 동의 하 직접 청취" },
];

const labelCls = "flex flex-col gap-1 text-[length:var(--text-body-sm)] text-[var(--color-fg-secondary)]";
const inputCls =
  "min-h-[44px] rounded-[var(--radius-sm)] bg-[var(--color-bg-raised)] px-3 text-[length:var(--text-body)] ring-1 ring-inset ring-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

function StarSelect({ name, label }: { name: string; label: string }) {
  return (
    <label className={labelCls}>
      {label}
      <select name={name} defaultValue="" className={inputCls}>
        <option value="">정보 없음</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            ★ {n}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ReviewForm({ regions }: { regions: { id: string; name: string }[] }) {
  const [origin, setOrigin] = useState<ReviewOrigin | "">("");

  return (
    <form action={submitReviewAction} className="flex flex-col gap-4">
      {/* 1) origin 선택이 먼저 */}
      <label className={labelCls}>
        출처 유형 (origin)
        <select
          name="origin"
          required
          value={origin}
          onChange={(e) => setOrigin(e.target.value as ReviewOrigin)}
          className={inputCls}
        >
          <option value="">— 선택 —</option>
          {ORIGINS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {origin && (
        <p className="rounded-[var(--radius-sm)] bg-[var(--color-bg-sunken)] px-3 py-2 text-[length:var(--text-body-sm)] text-[var(--color-fg-secondary)]">
          {ORIGINS.find((o) => o.value === origin)?.note}
        </p>
      )}

      {origin && (
        <>
          <label className={labelCls}>
            지역
            <select name="regionId" required defaultValue="" className={inputCls}>
              <option value="">— 선택 —</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          {/* origin별 출처 필드 */}
          {origin === "public_doc" && (
            <fieldset className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              <legend className="px-1 text-[length:var(--text-body-sm)] font-bold text-[var(--color-accent)]">
                출처 (공공누리 제1유형 — 필수)
              </legend>
              <label className={labelCls}>발간 기관<input name="sourceOrg" required className={inputCls} placeholder="예: 보령시" /></label>
              <label className={labelCls}>발간 연도<input name="sourceYear" type="number" required className={inputCls} placeholder="2025" /></label>
              <label className={labelCls}>저작물명<input name="sourceTitle" required className={inputCls} placeholder="2025 한달살기 결과보고서" /></label>
              <label className={labelCls}>출처 URL<input name="sourceUrl" type="url" required className={inputCls} placeholder="https://..." /></label>
              <label className="flex items-center gap-2 text-[length:var(--text-body-sm)] text-[var(--color-fg-secondary)]">
                <input type="checkbox" required className="h-5 w-5" />
                공공누리 <b>제1유형</b>이며 &ldquo;제3자 저작권 포함&rdquo; 부분이 아님을 확인했습니다
              </label>
            </fieldset>
          )}

          {origin === "licensed" && (
            <fieldset className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              <legend className="px-1 text-[length:var(--text-body-sm)] font-bold text-[var(--color-accent)]">이용허락 (필수)</legend>
              <label className={labelCls}>원문 URL<input name="sourceUrl" type="url" required className={inputCls} /></label>
              <label className={labelCls}>동의서 파일 URL<input name="consentDocUrl" type="url" required className={inputCls} placeholder="비공개 버킷 링크" /></label>
            </fieldset>
          )}

          {origin === "curated" && (
            <fieldset className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              <legend className="px-1 text-[length:var(--text-body-sm)] font-bold text-[var(--color-accent-warm)]">
                사실 추출 — 원문 저장 금지
              </legend>
              <p className="text-[length:var(--text-body-sm)] text-[var(--color-fg-muted)]">
                원문을 붙여넣는 필드는 없습니다. 별점·비용 같은 <b>사실</b>과 직접 쓴 총평(400자)만 저장합니다.
              </p>
              <label className={labelCls}>출처 URL<input name="sourceUrl" type="url" required className={inputCls} /></label>
              <label className={labelCls}>출처 도메인<input name="sourceDomain" required className={inputCls} placeholder="example.com (편중 감시용)" /></label>
            </fieldset>
          )}

          {/* 구조화 별점 (근거 없으면 '정보 없음' = null) */}
          <fieldset className="grid grid-cols-2 gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
            <legend className="px-1 text-[length:var(--text-body-sm)] font-bold">별점 (근거 있을 때만 — 추정 금지)</legend>
            <StarSelect name="medicalAccess" label="의료접근성" />
            <StarSelect name="loneliness" label="외로움/커뮤니티" />
            <StarSelect name="transport" label="교통편의" />
            <StarSelect name="revisit" label="재방문의사" />
            <label className={labelCls}>한달실비(만원)<input name="monthlyCost" type="number" className={inputCls} placeholder="근거 없으면 비움" /></label>
          </fieldset>

          <label className={labelCls}>
            {origin === "curated" ? "총평 (직접 작성 · 400자 이내)" : "자유서술 / 발췌"}
            <textarea name="summary" rows={3} maxLength={origin === "curated" ? 400 : 2000} className={inputCls} />
          </label>
          <label className={labelCls}>태그 (쉼표로 구분)<input name="tags" className={inputCls} placeholder="바다, 조용함, 의료좋음" /></label>

          <button type="submit" className="mt-1 min-h-[var(--touch-min)] rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 text-[length:var(--text-body-lg)] font-bold text-[var(--color-bg-raised)] hover:opacity-90">
            검수 저장
          </button>
        </>
      )}
    </form>
  );
}

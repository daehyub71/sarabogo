import { cn } from "@/lib/cn";

// 별점 표시. value가 null이면 별을 그리지 않고 "정보 없음"을 노출한다.
// null을 0개 별로 표현하지 않는다 — 그것은 "나쁨"이 아니라 "모름"이다 (CLAUDE.md).
export interface StarRatingProps {
  /** 1~5 또는 null(정보 없음). */
  value: number | null;
  /** 별 옆에 숫자(예: 4.3)를 함께 보일지. */
  showNumber?: boolean;
  className?: string;
}

const FULL = "★";
const EMPTY = "☆";

export function StarRating({ value, showNumber = true, className }: StarRatingProps) {
  if (value === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center text-[length:var(--text-body-sm)] text-[var(--color-fg-muted)]",
          className,
        )}
      >
        정보 없음
      </span>
    );
  }

  const rounded = Math.round(value);
  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      role="img"
      aria-label={`별점 5점 만점에 ${value}점`}
    >
      <span aria-hidden className="text-[var(--color-star)] tracking-[1px]">
        {FULL.repeat(rounded)}
        <span className="text-[var(--color-border-strong)]">
          {EMPTY.repeat(5 - rounded)}
        </span>
      </span>
      {showNumber && (
        <span className="text-[length:var(--text-body-sm)] text-[var(--color-fg-secondary)] tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}

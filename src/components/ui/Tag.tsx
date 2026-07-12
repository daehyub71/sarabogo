import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

// 블랙야크 트래커 Tag를 이식. 터치 타겟은 시니어 기준 48px로 상향.
export interface TagProps {
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  selected?: boolean;
  className?: string;
}

const baseClass =
  "inline-flex items-center gap-1 rounded-[var(--radius-full)] px-4 text-[length:var(--text-body-sm)] leading-[var(--text-body-sm--line-height)]";

const interactiveClass =
  "min-h-[var(--touch-min)] cursor-pointer ring-1 ring-inset transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

const staticClass = "min-h-[32px] py-1 ring-1 ring-inset";

const selectedClass =
  "bg-[var(--color-accent)] text-[var(--color-bg-raised)] ring-[var(--color-accent)]";

const idleClass =
  "bg-[var(--color-bg-raised)] text-[var(--color-fg-secondary)] ring-[var(--color-border)] hover:text-[var(--color-fg-primary)] hover:ring-[var(--color-border-strong)]";

export function Tag({ children, onClick, selected = false, className }: TagProps) {
  if (onClick) {
    const handleKey = (event: KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick(event);
      }
    };
    return (
      <span
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onClick}
        onKeyDown={handleKey}
        className={cn(baseClass, interactiveClass, selected ? selectedClass : idleClass, className)}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        baseClass,
        staticClass,
        "bg-[var(--color-bg-raised)] text-[var(--color-fg-secondary)] ring-[var(--color-border)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

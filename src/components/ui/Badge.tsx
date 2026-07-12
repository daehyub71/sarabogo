import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

// 블랙야크 트래커 Badge를 살아보고 토큰으로 이식.
type Tone = "neutral" | "accent" | "warm" | "cool";

export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  tone?: Tone;
  children: ReactNode;
}

const toneClass: Record<Tone, string> = {
  neutral:
    "bg-[var(--color-bg-sunken)] text-[var(--color-fg-primary)] ring-1 ring-inset ring-[var(--color-border)]",
  accent:
    "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-accent)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--color-accent)_30%,transparent)]",
  warm: "bg-[color-mix(in_srgb,var(--color-accent-warm)_14%,transparent)] text-[var(--color-accent-warm)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--color-accent-warm)_30%,transparent)]",
  cool: "bg-[color-mix(in_srgb,var(--color-accent-cool)_14%,transparent)] text-[var(--color-accent-cool)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--color-accent-cool)_30%,transparent)]",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-[3px] text-[length:var(--text-label)] leading-[var(--text-label--line-height)] font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

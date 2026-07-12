import { cn } from "@/lib/cn";

// 블랙야크 트래커 SegmentedControl 이식. 접근성 라디오 그룹 + 48px 터치.
export interface SegmentedItem<TValue extends string> {
  value: TValue;
  label: string;
}

export interface SegmentedControlProps<TValue extends string> {
  items: ReadonlyArray<SegmentedItem<TValue>>;
  value: TValue;
  onChange: (next: TValue) => void;
  label: string;
  className?: string;
}

export function SegmentedControl<TValue extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex rounded-[var(--radius-md)] bg-[var(--color-bg-sunken)] p-1 ring-1 ring-inset ring-[var(--color-border)]",
        className,
      )}
    >
      {items.map((item) => {
        const checked = item.value === value;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={checked}
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              "min-h-[var(--touch-min)] cursor-pointer rounded-[var(--radius-sm)] px-4 text-[length:var(--text-body-sm)] font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
              checked
                ? "bg-[var(--color-bg-raised)] text-[var(--color-fg-primary)] shadow-[var(--shadow-xs)]"
                : "text-[var(--color-fg-secondary)] hover:text-[var(--color-fg-primary)]",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

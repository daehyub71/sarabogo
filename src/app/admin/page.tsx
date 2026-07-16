import Link from "next/link";

export const dynamic = "force-dynamic";

const CARDS = [
  {
    href: "/admin/reviews/new",
    title: "후기 시딩 입력",
    desc: "출처(origin)를 먼저 고르면 그에 맞는 폼이 뜹니다. 정책 위반 입력은 아예 만들 수 없습니다.",
  },
];

export default function AdminHome() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[length:var(--text-body-sm)] text-[var(--color-fg-muted)]">
        이 콘솔은 입력 창구가 아니라 <b>정책 게이트</b>입니다. 손으로 붙여넣는 것은 느린 크롤링일
        뿐입니다.
      </p>
      {CARDS.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="rounded-[var(--radius-md)] bg-[var(--color-bg-raised)] p-4 ring-1 ring-inset ring-[var(--color-border)] hover:ring-[var(--color-border-strong)]"
        >
          <div className="text-[length:var(--text-body-lg)] font-bold text-[var(--color-fg-primary)]">
            {c.title}
          </div>
          <div className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-fg-secondary)]">
            {c.desc}
          </div>
        </Link>
      ))}
    </div>
  );
}

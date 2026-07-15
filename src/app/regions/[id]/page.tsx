import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import type { Place, PlaceKind } from "@/types/domain";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<PlaceKind, string> = {
  hospital: "병원",
  pharmacy: "약국",
  tour: "관광지",
  stay: "숙소",
  mart: "마트",
  festival: "행사",
};

// Phase 1: 카카오맵 승인 전까지 장소를 목록으로 보여준다. 승인 후 지도+마커로 교체.
export default async function RegionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let region: { name: string; hospitalCount: number; pharmacyCount: number } | null = null;
  let places: Place[] = [];
  try {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const r = await db.getRegion(id);
    if (!r) notFound();
    region = { name: r.name, hospitalCount: r.hospitalCount, pharmacyCount: r.pharmacyCount };
    places = await db.listPlacesByRegion(id);
  } catch {
    notFound();
  }

  const byKind = (kind: PlaceKind) =>
    places.filter((p) => p.kind === kind).slice(0, 20);

  return (
    <main className="mx-auto w-full max-w-[var(--feed-max-width)] px-4 py-6">
      <Link
        href="/"
        className="text-[length:var(--text-body-sm)] text-[var(--color-accent)]"
      >
        ← 지역 목록
      </Link>

      <h1 className="mt-3 text-[length:var(--text-display-md)] font-bold text-[var(--color-fg-primary)]">
        {region.name}
      </h1>
      <div className="mt-2 flex gap-2">
        <Badge tone="accent">병원 {region.hospitalCount}곳</Badge>
        <Badge tone="cool">약국 {region.pharmacyCount}곳</Badge>
      </div>

      {/* 지도 자리 — 카카오맵 승인 후 마커로 채운다 */}
      <div className="mt-4 flex aspect-[16/9] w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-sunken)] text-[length:var(--text-body-sm)] text-[var(--color-fg-muted)]">
        지도 준비 중 (카카오맵 연동 예정)
      </div>

      {(["hospital", "pharmacy", "tour", "stay"] as PlaceKind[]).map((kind) => {
        const list = byKind(kind);
        if (list.length === 0) return null;
        return (
          <section key={kind} className="mt-6">
            <h2 className="mb-2 text-[length:var(--text-lead)] font-bold text-[var(--color-fg-primary)]">
              {KIND_LABEL[kind]}
            </h2>
            <ul className="flex list-none flex-col gap-1 p-0">
              {list.map((p) => (
                <li
                  key={p.id}
                  className="rounded-[var(--radius-sm)] bg-[var(--color-bg-raised)] px-3 py-2 text-[length:var(--text-body-sm)] ring-1 ring-inset ring-[var(--color-border)]"
                >
                  <span className="font-medium text-[var(--color-fg-primary)]">{p.name}</span>
                  {p.address && (
                    <span className="block text-[var(--color-fg-muted)]">{p.address}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}

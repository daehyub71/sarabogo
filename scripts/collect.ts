#!/usr/bin/env tsx
/**
 * 지역 수집 배치 (수동 실행 · 추후 Edge Function으로 이관).
 *
 * 심평원 병원·약국 + 관광공사 관광지·숙박 → places 적재, regions 집계 갱신.
 * 실행: set -a && . ./.env && set +a && npx tsx scripts/collect.ts
 *
 * ⚠️ Phase 1 파일럿: 대상 지역을 코드에 둔다. Q2 확정 후 regions 시드에서 읽도록 바꾼다.
 */
import { createClient } from "@supabase/supabase-js";
import { createSupabaseWriter } from "@/lib/collect/adapters/supabase-writer";
import { collectRegion, type RegionTarget } from "@/lib/collect";

const serviceKey = process.env.TOUR_API_KEY; // 관광공사·심평원 공용 인증키
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey || !url || !svc) {
  console.error("환경변수 누락: TOUR_API_KEY / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const client = createClient(url, svc, { auth: { persistSession: false } });
const writer = createSupabaseWriter(client);

// regions 테이블에서 수집에 필요한 코드가 모두 채워진 지역을 읽는다.
async function resolveTargets(): Promise<RegionTarget[]> {
  const { data, error } = await client
    .from("regions")
    .select("id, name, area_code, sigungu_code, hira_sido_cd, hira_sggu_cd")
    .not("sigungu_code", "is", null)
    .not("hira_sido_cd", "is", null)
    .not("hira_sggu_cd", "is", null)
    .order("name");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("수집 대상 지역이 없다. supabase/seed_regions.sql을 먼저 적용하라.");
  }

  return data.map((r) => ({
    regionId: r.id as string,
    name: r.name as string,
    ktoAreaCode: r.area_code as number,
    ktoSigunguCode: r.sigungu_code as number,
    hiraSidoCd: r.hira_sido_cd as string,
    hiraSgguCd: r.hira_sggu_cd as string,
  }));
}

async function main() {
  const targets = await resolveTargets();
  console.log(`수집 대상: ${targets.length}개 지역\n`);

  for (const t of targets) {
    process.stdout.write(`[${t.name}] 수집 중… `);
    try {
      const r = await collectRegion(t, { serviceKey: serviceKey!, writer, limit: 100 });
      console.log(
        `✅ 병원 ${r.hospitals} · 약국 ${r.pharmacies} · 관광지 ${r.tours} · 숙박 ${r.stays} ` +
          `→ regions 집계(병원 ${r.counts.hospital}, 약국 ${r.counts.pharmacy})`,
      );
    } catch (e) {
      console.log(`❌ ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

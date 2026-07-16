#!/usr/bin/env tsx
/**
 * 산림청 100대명산 목록을 mountains 테이블에 적재(전국 고정 목록, 1회성/드묾).
 * 실행: set -a && . ./.env && set +a && npx tsx scripts/collect-mountains.ts
 */
import { createClient } from "@supabase/supabase-js";
import { fetchTop100Mountains } from "@/lib/forest";

const serviceKey = process.env.TOUR_API_KEY;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey || !url || !svc) {
  console.error("환경변수 누락: TOUR_API_KEY / SUPABASE_URL / SERVICE_ROLE_KEY");
  process.exit(1);
}

const client = createClient(url, svc, { auth: { persistSession: false } });

async function main() {
  const mountains = await fetchTop100Mountains(serviceKey!);
  console.log(`100대명산 ${mountains.length}건 수신`);

  // frtrlId(유일)로 dedupe. mtnCd는 유일하지 않으므로 키로 쓰지 않는다.
  const byId = new Map(mountains.map((m) => [m.id, m]));
  const rows = [...byId.values()].map((m) => ({
    frtrl_id: m.id,
    mtn_cd: m.mtnCd,
    name: m.name,
    province: m.province,
    address: m.address,
    lat: m.lat,
    lng: m.lng,
    altitude: m.altitude,
  }));
  // ⚠️ forest_mountains (블랙야크의 mountains와 분리 — 공유 DB).
  const { error } = await client.from("forest_mountains").upsert(rows, { onConflict: "frtrl_id" });
  if (error) throw error;

  console.log(`✅ forest_mountains 적재 완료 (${rows.length}건, 좌표 ${rows.filter((r) => r.lat).length})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

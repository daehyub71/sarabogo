/**
 * 수집 배치 전용 Supabase 쓰기 어댑터.
 *
 * 배치는 service_role로 places/regions에만 쓴다 (PLAN.md: 사용자 데이터엔 손대지 않음).
 * 벤더 SDK import는 adapters/ 안에서만 허용된다 (CLAUDE.md C-5).
 *
 * DbPort(읽기 경계)와 분리한 이유: 배치는 Deno/Node 어디서든 돌 수 있어야 하고,
 * RLS를 우회하는 특권 쓰기라 화면이 쓰는 포트와 권한 성격이 다르다.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NewPlace } from "@/types/domain";

function placeToRow(p: NewPlace): Record<string, unknown> {
  return {
    region_id: p.regionId,
    content_id: p.contentId,
    google_place_id: p.googlePlaceId,
    kind: p.kind,
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    meta: p.meta,
    source: p.source,
  };
}

export interface CollectWriter {
  /** 지역의 특정 source 장소를 교체(idempotent 재실행). 반환: 적재 건수. */
  replacePlaces(regionId: string, source: string, places: NewPlace[]): Promise<number>;
  /** 지역의 병원·약국 수를 places에서 세어 regions에 갱신. */
  updateRegionCounts(regionId: string): Promise<{ hospital: number; pharmacy: number }>;
}

export function createSupabaseWriter(client: SupabaseClient): CollectWriter {
  return {
    async replacePlaces(regionId, source, places) {
      // 같은 지역+출처를 먼저 지우고 새로 넣는다 → 재실행해도 중복이 쌓이지 않는다.
      const del = await client
        .from("places")
        .delete()
        .eq("region_id", regionId)
        .eq("source", source);
      if (del.error) throw del.error;

      if (places.length === 0) return 0;
      const ins = await client.from("places").insert(places.map(placeToRow));
      if (ins.error) throw ins.error;
      return places.length;
    },

    async updateRegionCounts(regionId) {
      const count = async (kind: string) => {
        const { count: c, error } = await client
          .from("places")
          .select("*", { count: "exact", head: true })
          .eq("region_id", regionId)
          .eq("kind", kind);
        if (error) throw error;
        return c ?? 0;
      };
      const hospital = await count("hospital");
      const pharmacy = await count("pharmacy");
      const { error } = await client
        .from("regions")
        .update({ hospital_count: hospital, pharmacy_count: pharmacy })
        .eq("id", regionId);
      if (error) throw error;
      return { hospital, pharmacy };
    },
  };
}

export function createSupabaseWriterFromEnv(): CollectWriter {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수 누락 (URL / SERVICE_ROLE_KEY)");
  return createSupabaseWriter(createClient(url, key, { auth: { persistSession: false } }));
}

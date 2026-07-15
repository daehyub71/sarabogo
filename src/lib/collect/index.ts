/**
 * 지역 수집 오케스트레이션.
 *
 * 심평원 병원·약국 + 관광공사 관광지·숙박을 모아 places에 적재하고 regions 집계를 갱신한다.
 * 화면은 이 결과(places/regions)만 읽는다 — 외부 API를 실시간 호출하지 않는다.
 */
import { fetchHospitals, fetchPharmacies } from "@/lib/hira";
import { fetchAreaBasedList } from "@/lib/kto";
import { hiraToPlace, ktoToPlace } from "@/lib/collect/mappers";
import type { CollectWriter } from "@/lib/collect/adapters/supabase-writer";
import type { NewPlace } from "@/types/domain";

/** 한 지역의 수집 대상 코드. KTO와 심평원은 시군구 코드 체계가 다르다. */
export interface RegionTarget {
  regionId: string;
  name: string;
  ktoAreaCode: number;
  ktoSigunguCode: number;
  hiraSidoCd: string;
  hiraSgguCd: string;
}

export interface CollectResult {
  region: string;
  hospitals: number;
  pharmacies: number;
  tours: number;
  stays: number;
  counts: { hospital: number; pharmacy: number };
}

/** 지역 하나를 수집해 적재한다. */
export async function collectRegion(
  target: RegionTarget,
  deps: { serviceKey: string; writer: CollectWriter; limit?: number },
): Promise<CollectResult> {
  const { serviceKey, writer } = deps;
  const numOfRows = deps.limit ?? 100;

  // ── 심평원: 병원·약국 (좌표 직접 제공) ──
  const [hospitals, pharmacies] = await Promise.all([
    fetchHospitals({ serviceKey, sidoCd: target.hiraSidoCd, sgguCd: target.hiraSgguCd, numOfRows }),
    fetchPharmacies({ serviceKey, sidoCd: target.hiraSidoCd, sgguCd: target.hiraSgguCd, numOfRows }),
  ]);

  // ── 관광공사: 관광지(12)·숙박(32) ──
  const [tours, stays] = await Promise.all([
    fetchAreaBasedList(
      { areaCode: target.ktoAreaCode, sigunguCode: target.ktoSigunguCode, contentTypeId: 12, numOfRows },
      { serviceKey },
    ),
    fetchAreaBasedList(
      { areaCode: target.ktoAreaCode, sigunguCode: target.ktoSigunguCode, contentTypeId: 32, numOfRows },
      { serviceKey },
    ),
  ]);

  const hiraPlaces: NewPlace[] = [
    ...hospitals.map((f) => hiraToPlace(target.regionId, f)),
    ...pharmacies.map((f) => hiraToPlace(target.regionId, f)),
  ];
  const ktoPlaces: NewPlace[] = [
    ...tours.map((t) => ktoToPlace(target.regionId, t)),
    ...stays.map((s) => ktoToPlace(target.regionId, s)),
  ];

  // source별로 교체 적재 (재실행 idempotent)
  await writer.replacePlaces(target.regionId, "hira", hiraPlaces);
  await writer.replacePlaces(target.regionId, "kto", ktoPlaces);
  const counts = await writer.updateRegionCounts(target.regionId);

  return {
    region: target.name,
    hospitals: hospitals.length,
    pharmacies: pharmacies.length,
    tours: tours.length,
    stays: stays.length,
    counts,
  };
}

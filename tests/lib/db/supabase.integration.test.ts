import { describe } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseDb } from "@/lib/db/adapters/supabase";
import { runDbContract } from "./contract";

/**
 * Supabase 어댑터 통합 계약 테스트.
 *
 * memory 어댑터와 "동일한" runDbContract를 돌린다 — 추상화가 실제로 성립함을 증명.
 * 단, 실 DB 자격증명이 필요하므로 전용 테스트 프로젝트 환경변수가 있을 때만 실행한다.
 * 미설정 시 skip (Phase 0에서는 memory 계약이 1차 검증자).
 *
 * 실행 조건: SUPABASE_TEST_URL, SUPABASE_TEST_SERVICE_KEY 설정 +
 *            테스트 스키마가 마이그레이션 반영된 빈 프로젝트.
 */
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_SERVICE_KEY;
const enabled = Boolean(url && key);

describe.skipIf(!enabled)("supabase (integration)", () => {
  // 클라이언트는 skip이 아닐 때만 생성한다. describe 본문은 collection 시점에
  // 항상 실행되므로, 여기서 createClient를 바로 부르면 skip이어도 터진다.
  const client = createClient(url ?? "http://localhost", key ?? "test-key", {
    auth: { persistSession: false },
  });

  runDbContract("supabase", async (seed) => {
    // 시드 데이터를 실제 테이블에 적재한 뒤 어댑터를 반환한다.
    // 계약 스위트가 update/delete로 변형하므로 전용 테스트 DB에서만 돌린다.
    // ⚠️ id는 uuid다. neq("id","")는 빈 문자열↔uuid 비교로 실패해 정리가 안 된다.
    //    존재할 수 없는 uuid로 neq를 걸어 전 행을 지운다. reviews→regions 순(FK).
    const NIL = "00000000-0000-0000-0000-000000000000";
    await client.from("reviews").delete().neq("id", NIL);
    await client.from("regions").delete().neq("id", NIL);
    if (seed.regions?.length) {
      await client.from("regions").insert(
        seed.regions.map((r) => ({
          id: r.id,
          area_code: r.areaCode,
          sigungu_code: r.sigunguCode,
          name: r.name,
          lat: r.lat,
          lng: r.lng,
          hospital_count: r.hospitalCount,
          pharmacy_count: r.pharmacyCount,
          avg_monthly_cost: r.avgMonthlyCost,
        })),
      );
    }
    if (seed.reviews?.length) {
      await client.from("reviews").insert(
        seed.reviews.map((r) => ({
          id: r.id,
          region_id: r.regionId,
          origin: r.origin,
          author_id: r.authorId,
          medical_access: r.medicalAccess,
          loneliness: r.loneliness,
          transport: r.transport,
          revisit: r.revisit,
          monthly_cost: r.monthlyCost,
          summary: r.summary,
          tags: r.tags,
          source_org: r.sourceOrg,
          source_year: r.sourceYear,
          source_title: r.sourceTitle,
          source_url: r.sourceUrl,
          source_domain: r.sourceDomain,
          source_license: r.sourceLicense,
          consent_doc_url: r.consentDocUrl,
          extracted_by: r.extractedBy,
          verified_by: r.verifiedBy,
          verified_at: r.verifiedAt,
        })),
      );
    }
    return createSupabaseDb(client);
  });
});

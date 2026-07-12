/**
 * Supabase DbPort 어댑터 — 기본 구현.
 *
 * 벤더 SDK(@supabase/supabase-js) import는 이 파일(및 adapters/ 하위)에서만 허용된다
 * (CLAUDE.md C-5, eslint no-restricted-imports). 바깥은 DbPort 인터페이스만 본다.
 *
 * DB는 snake_case, 도메인은 camelCase다. 매핑을 이 경계에서 처리해 벤더 형태가
 * 도메인으로 새지 않게 한다.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DbPort, ReviewPatch } from "@/lib/db/port";
import type {
  Course,
  NewReview,
  Profile,
  Region,
  Review,
} from "@/types/domain";

// ── row → 도메인 매퍼 ───────────────────────────
interface RegionRow {
  id: string;
  area_code: number;
  sigungu_code: number | null;
  name: string;
  lat: number | null;
  lng: number | null;
  hospital_count: number;
  pharmacy_count: number;
  avg_monthly_cost: number | null;
}

interface ReviewRow {
  id: string;
  region_id: string;
  origin: Review["origin"];
  author_id: string | null;
  medical_access: number | null;
  loneliness: number | null;
  transport: number | null;
  revisit: number | null;
  monthly_cost: number | null;
  summary: string | null;
  tags: string[] | null;
  source_org: string | null;
  source_year: number | null;
  source_title: string | null;
  source_url: string | null;
  source_domain: string | null;
  source_license: Review["sourceLicense"];
  consent_doc_url: string | null;
  extracted_by: Review["extractedBy"];
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

function toRegion(r: RegionRow): Region {
  return {
    id: r.id,
    areaCode: r.area_code,
    sigunguCode: r.sigungu_code,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    hospitalCount: r.hospital_count,
    pharmacyCount: r.pharmacy_count,
    avgMonthlyCost: r.avg_monthly_cost,
  };
}

function toReview(r: ReviewRow): Review {
  return {
    id: r.id,
    regionId: r.region_id,
    origin: r.origin,
    authorId: r.author_id,
    medicalAccess: r.medical_access,
    loneliness: r.loneliness,
    transport: r.transport,
    revisit: r.revisit,
    monthlyCost: r.monthly_cost,
    summary: r.summary,
    tags: r.tags ?? [],
    sourceOrg: r.source_org,
    sourceYear: r.source_year,
    sourceTitle: r.source_title,
    sourceUrl: r.source_url,
    sourceDomain: r.source_domain,
    sourceLicense: r.source_license,
    consentDocUrl: r.consent_doc_url,
    extractedBy: r.extracted_by,
    verifiedBy: r.verified_by,
    verifiedAt: r.verified_at,
    createdAt: r.created_at,
  };
}

function reviewToRow(r: NewReview): Omit<ReviewRow, "id" | "created_at"> {
  return {
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
  };
}

function patchToRow(p: ReviewPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("medicalAccess" in p) row.medical_access = p.medicalAccess;
  if ("loneliness" in p) row.loneliness = p.loneliness;
  if ("transport" in p) row.transport = p.transport;
  if ("revisit" in p) row.revisit = p.revisit;
  if ("monthlyCost" in p) row.monthly_cost = p.monthlyCost;
  if ("summary" in p) row.summary = p.summary;
  if ("tags" in p) row.tags = p.tags;
  if ("verifiedBy" in p) row.verified_by = p.verifiedBy;
  if ("verifiedAt" in p) row.verified_at = p.verifiedAt;
  return row;
}

// ── 어댑터 ──────────────────────────────────────
export function createSupabaseDb(client: SupabaseClient): DbPort {
  return {
    async listRegions() {
      const { data, error } = await client.from("regions").select("*");
      if (error) throw error;
      return (data as RegionRow[]).map(toRegion);
    },

    async getRegion(id) {
      const { data, error } = await client
        .from("regions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toRegion(data as RegionRow) : null;
    },

    async listPublicReviewsByRegion(regionId) {
      // 공개 기준: 사용자 후기 또는 검수 완료분. 미검수 시딩은 제외 (FR-2.6).
      const { data, error } = await client
        .from("reviews")
        .select("*")
        .eq("region_id", regionId)
        .or("origin.eq.user,verified_at.not.is.null");
      if (error) throw error;
      return (data as ReviewRow[]).map(toReview);
    },

    async getReview(id) {
      const { data, error } = await client
        .from("reviews")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toReview(data as ReviewRow) : null;
    },

    async createReview(review: NewReview) {
      const { data, error } = await client
        .from("reviews")
        .insert(reviewToRow(review))
        .select("*")
        .single();
      if (error) throw error;
      return toReview(data as ReviewRow);
    },

    async updateReview(id, patch) {
      const { data, error } = await client
        .from("reviews")
        .update(patchToRow(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return toReview(data as ReviewRow);
    },

    async deleteReview(id) {
      const { error } = await client.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },

    async listCoursesByRegion(regionId) {
      const { data, error } = await client
        .from("courses")
        .select("*")
        .eq("region_id", regionId);
      if (error) throw error;
      return (data as Array<Record<string, unknown>>).map(
        (c): Course => ({
          id: c.id as string,
          regionId: c.region_id as string,
          title: c.title as string,
          origin: c.origin as Course["origin"],
          weeks: (c.weeks as Course["weeks"]) ?? [],
          basedOnReviewIds: (c.based_on_review_ids as string[]) ?? [],
          createdAt: c.created_at as string,
        }),
      );
    },

    async getProfile(id) {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const p = data as Record<string, unknown>;
      return {
        id: p.id as string,
        nickname: (p.nickname as string) ?? null,
        ageGroup: (p.age_group as Profile["ageGroup"]) ?? null,
        role: p.role as Profile["role"],
        createdAt: p.created_at as string,
      };
    },
  };
}

/** 서버 환경변수로 service_role 클라이언트를 만들어 어댑터를 생성한다. */
export function createSupabaseDbFromEnv(): DbPort {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createSupabaseDb(createClient(url, key, { auth: { persistSession: false } }));
}

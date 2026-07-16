/**
 * 인메모리 DbPort 어댑터.
 *
 * 용도 둘: (1) 단위 테스트, (2) 추상화가 실제로 성립하는지 증명.
 * 같은 계약 테스트가 이 어댑터와 Supabase 어댑터 양쪽에서 통과해야 한다 (R12).
 * 벤더 SDK를 import하지 않으므로 인가·비즈니스 로직 테스트가 DB 없이 돌아간다.
 */
import type { DbPort, NewAdminAudit, ReviewPatch } from "@/lib/db/port";
import type {
  Course,
  FamousMountain,
  NewReview,
  Place,
  Profile,
  Region,
  RegionSummary,
  Review,
} from "@/types/domain";
import { overallStars } from "@/lib/reviews-aggregate";
import { countyMatchToken } from "@/lib/region-match";

interface Seed {
  regions?: Region[];
  reviews?: Review[];
  courses?: Course[];
  profiles?: Profile[];
  places?: Place[];
  mountains?: FamousMountain[];
}

export function createMemoryDb(seed: Seed = {}): DbPort {
  const regions = new Map<string, Region>(
    (seed.regions ?? []).map((r) => [r.id, r]),
  );
  const reviews = new Map<string, Review>(
    (seed.reviews ?? []).map((r) => [r.id, r]),
  );
  const courses = new Map<string, Course>(
    (seed.courses ?? []).map((c) => [c.id, c]),
  );
  const profiles = new Map<string, Profile>(
    (seed.profiles ?? []).map((p) => [p.id, p]),
  );
  const places: Place[] = seed.places ?? [];
  const audits: NewAdminAudit[] = [];
  const mountains: FamousMountain[] = seed.mountains ?? [];
  const mountainsNear = (regionName: string) => {
    const token = countyMatchToken(regionName);
    return mountains
      .filter((m) => (m.address ?? "").includes(token))
      .sort((a, b) => (b.altitude ?? 0) - (a.altitude ?? 0));
  };

  let counter = reviews.size;
  const nextId = () => `mem-review-${++counter}`;

  const isPublic = (r: Review) => r.origin === "user" || r.verifiedAt !== null;
  const publicReviewsOf = (regionId: string) =>
    [...reviews.values()].filter((r) => r.regionId === regionId && isPublic(r));

  return {
    async listRegions() {
      return [...regions.values()];
    },

    async getRegion(id) {
      return regions.get(id) ?? null;
    },

    async listRegionSummaries() {
      return [...regions.values()].map((region): RegionSummary => {
        const rv = publicReviewsOf(region.id);
        const cover = places.find(
          (p) =>
            p.regionId === region.id &&
            p.kind === "tour" &&
            typeof p.meta?.firstImage === "string",
        );
        return {
          ...region,
          reviewCount: rv.length,
          avgStars: overallStars(rv),
          coverImageUrl: (cover?.meta?.firstImage as string) ?? null,
          mountainCount: mountainsNear(region.name).length,
        };
      });
    },

    async listPlacesByRegion(regionId, kind) {
      return places.filter(
        (p) => p.regionId === regionId && (kind === undefined || p.kind === kind),
      );
    },

    async listMountainsByRegion(regionId) {
      const region = regions.get(regionId);
      return region ? mountainsNear(region.name) : [];
    },

    async listPublicReviewsByRegion(regionId) {
      return [...reviews.values()].filter(
        (r) => r.regionId === regionId && isPublic(r),
      );
    },

    async getReview(id) {
      return reviews.get(id) ?? null;
    },

    async createReview(input: NewReview) {
      const review: Review = {
        ...input,
        id: nextId(),
        createdAt: new Date(0).toISOString(),
      };
      reviews.set(review.id, review);
      return review;
    },

    async updateReview(id, patch: ReviewPatch) {
      const existing = reviews.get(id);
      if (!existing) throw new Error(`review not found: ${id}`);
      const updated: Review = { ...existing, ...patch };
      reviews.set(id, updated);
      return updated;
    },

    async deleteReview(id) {
      reviews.delete(id);
    },

    async listCoursesByRegion(regionId) {
      return [...courses.values()].filter((c) => c.regionId === regionId);
    },

    async getProfile(id) {
      return profiles.get(id) ?? null;
    },

    async recordAdminAudit(entry: NewAdminAudit) {
      audits.push(entry);
    },
  };
}

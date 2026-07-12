/**
 * 도메인 타입 — 벤더(Supabase/Anthropic) 타입과 무관한 순수 모델.
 * 포트 시그니처는 이 타입만 주고받는다 (CLAUDE.md C-6).
 * 스키마 원본은 docs/04-database.md. 컬럼 변경 시 여기와 마이그레이션을 함께 고친다.
 */

/** 후기 출처. 곧 법적 근거이며, 관리자 콘솔은 이 값으로 폼을 분기한다. */
export type ReviewOrigin =
  | "user" // 서비스 사용자가 직접 작성 (본체)
  | "public_doc" // 공공누리 제1유형 공공저작물에서 추출 (주력 시딩)
  | "licensed" // 원저작자 개별 이용허락 (동의서 보관 필수)
  | "curated" // 공개 자료에서 '사실'만 추출 (원문 저장 금지)
  | "interview" // 참가자 인터뷰 (본인 동의)
  | "editor"; // 에디터 참고용

/** 원문 저장을 정당화하는 라이선스. 이 둘 외에는 원문 저장 불가. */
export type ReviewLicense = "KOGL-1" | "CONSENT";

/** 장소 종류. */
export type PlaceKind =
  | "tour"
  | "stay"
  | "hospital"
  | "pharmacy"
  | "mart"
  | "festival";

export interface Region {
  id: string;
  areaCode: number;
  sigunguCode: number | null;
  name: string;
  lat: number | null;
  lng: number | null;
  hospitalCount: number;
  pharmacyCount: number;
  /** 후기 기반 평균 한달실비(만원). 데이터 없으면 null. */
  avgMonthlyCost: number | null;
}

/**
 * 구조화 후기. 모든 별점은 nullable — 원문에 근거 없으면 null.
 * 화면·집계 어디서도 null을 0으로 치환하지 않는다 (CLAUDE.md).
 */
export interface Review {
  id: string;
  regionId: string;
  origin: ReviewOrigin;
  authorId: string | null;

  medicalAccess: number | null; // 1~5
  loneliness: number | null; // 1~5
  transport: number | null; // 1~5
  revisit: number | null; // 1~5
  monthlyCost: number | null; // 만원
  summary: string | null;
  tags: string[];

  sourceOrg: string | null;
  sourceYear: number | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourceDomain: string | null;
  sourceLicense: ReviewLicense | null;
  consentDocUrl: string | null;

  extractedBy: "llm" | "human" | null;
  verifiedBy: string | null;
  verifiedAt: string | null; // ISO8601. 검수 전에는 공개하지 않는다.

  createdAt: string;
}

/** 후기 작성 입력(생성 시). id·created_at 등 서버 생성 필드는 제외. */
export type NewReview = Omit<Review, "id" | "createdAt">;

export interface CourseWeek {
  week: number;
  plan: string;
}

export interface Course {
  id: string;
  regionId: string;
  title: string;
  origin: "editor" | "ai";
  weeks: CourseWeek[];
  /** 근거 후기 id (RAG 투명성). 렌더링 전 서버에서 실존 검증. */
  basedOnReviewIds: string[];
  createdAt: string;
}

export interface Profile {
  id: string;
  nickname: string | null;
  ageGroup: "50s" | "60s" | "70s+" | null;
  role: "user" | "admin";
  createdAt: string;
}

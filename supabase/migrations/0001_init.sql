-- 살아보고(SARABOGO) 초기 스키마.
-- 원본: docs/04-database.md. 스키마 변경 시 그 문서와 src/types/domain.ts를 함께 고친다.

-- ── 지역 마스터 ────────────────────────────────
create table regions (
  id uuid primary key default gen_random_uuid(),
  area_code int not null,              -- 관광공사 지역코드
  sigungu_code int,
  name text not null,                  -- "충남 보령시"
  lat double precision,
  lng double precision,
  hospital_count int not null default 0,
  pharmacy_count int not null default 0,
  avg_monthly_cost int,                -- 후기 기반 평균 한달실비(만원). 없으면 null.
  created_at timestamptz not null default now()
);

-- ── 지자체 지원 프로그램 (A층, 자체 수집) ──────────
create table programs (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id),
  title text not null,
  apply_start date,
  apply_end date,
  stay_start date,
  stay_end date,
  support_detail text,
  eligibility text,
  sns_required boolean not null default false,
  apply_url text,
  source text,
  created_at timestamptz not null default now()
);

-- ── 장소 캐시 (B층, 관광공사/심평원 정제) ───────────
-- 구글 Places는 place_id만 저장. 리뷰/상세는 실시간 조회.
create table places (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id),
  content_id text,                     -- 관광공사 contentId
  google_place_id text,                -- 구글 place_id만
  kind text not null,                  -- tour|stay|hospital|pharmacy|mart|festival
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  meta jsonb,
  source text not null default 'kto',  -- kto|hira|kakao
  updated_at timestamptz not null default now()
);

-- ── 사용자 프로필 ─────────────────────────────────
-- reviews가 참조하므로 먼저 생성한다.
create table profiles (
  id uuid primary key references auth.users(id),
  nickname text,
  age_group text,                      -- 50s|60s|70s+
  role text not null default 'user'    -- 'admin'만 관리자 콘솔 접근 (lib/authz)
    check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

-- 관리자 행위 감사 로그 (누가·무엇을·어떤 근거로)
create table admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references profiles(id),
  action text not null,                -- review.create|review.verify|program.create|...
  target_table text not null,
  target_id uuid,
  payload jsonb,                       -- origin·source_url·license 등 판단 근거 스냅샷
  created_at timestamptz not null default now()
);

-- ── 후기 출처 (곧 법적 근거) ──────────────────────
create type review_origin as enum (
  'user',        -- 서비스 사용자 직접 작성 (본체)
  'public_doc',  -- 공공누리 제1유형 공공저작물 추출 (주력 시딩) · 원문 발췌 저장 가능
  'licensed',    -- 원저작자 개별 이용허락 · 원문 저장 가능 · 동의서 필수
  'curated',     -- 공개 자료에서 '사실'만 추출 · 원문 저장 금지
  'interview',   -- 참가자 인터뷰 (본인 동의)
  'editor'       -- 에디터 참고용
);

-- ── 구조화 후기 (C층, 핵심 자산) ──────────────────
create table reviews (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id),
  origin review_origin not null default 'user',
  author_id uuid references profiles(id),

  -- 별점 1~5. 전부 nullable — 원문에 근거 없으면 null. 추정 기입 금지.
  medical_access smallint check (medical_access between 1 and 5),
  loneliness smallint check (loneliness between 1 and 5),
  transport smallint check (transport between 1 and 5),
  revisit smallint check (revisit between 1 and 5),
  monthly_cost int,
  summary text,
  tags text[],

  -- 출처
  source_org text,
  source_year int,
  source_title text,
  source_url text,
  source_domain text,                  -- curated 편중 감시용
  source_license text
    check (source_license is null or source_license in ('KOGL-1','CONSENT')),
  consent_doc_url text,                -- licensed일 때 동의서 (비공개 버킷)

  -- 추출·검수 이력
  extracted_by text check (extracted_by in ('llm','human')),
  verified_by uuid references profiles(id),
  verified_at timestamptz,             -- 검수 전에는 공개하지 않는다

  created_at timestamptz not null default now(),

  -- 사용자 후기: 작성자 + 필수 항목 강제
  constraint reviews_user_shape check (
    origin <> 'user' or (
      author_id is not null
      and medical_access is not null and loneliness is not null
      and transport is not null and revisit is not null
      and monthly_cost is not null
    )
  ),
  -- 공공저작물: 출처 4종 + KOGL-1 + 사람 검수
  constraint reviews_public_doc_shape check (
    origin <> 'public_doc' or (
      author_id is null
      and source_org is not null and source_year is not null
      and source_title is not null and source_url is not null
      and source_license = 'KOGL-1'
      and verified_at is not null
    )
  ),
  -- 이용허락: 동의서 없이는 저장 불가
  constraint reviews_licensed_shape check (
    origin <> 'licensed' or (
      source_url is not null
      and source_license = 'CONSENT'
      and consent_doc_url is not null
      and verified_at is not null
    )
  ),
  -- 큐레이션: 원문 저장 근거 없음 → 라이선스 비움 + summary 400자 상한(복붙 방지)
  constraint reviews_curated_shape check (
    origin <> 'curated' or (
      source_url is not null
      and source_domain is not null
      and source_license is null
      and consent_doc_url is null
      and (summary is null or char_length(summary) <= 400)
      and verified_at is not null
    )
  )
);

-- ── 추천 코스 (에디터 + AI) ───────────────────────
create table courses (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id),
  title text not null,
  origin text not null default 'ai',   -- editor|ai
  weeks jsonb,
  based_on_review_ids uuid[],          -- 근거 후기 id (RAG 투명성)
  created_at timestamptz not null default now()
);

-- ── 인덱스 ────────────────────────────────────────
create index idx_reviews_region on reviews(region_id);
create index idx_reviews_source_domain on reviews(source_domain) where origin = 'curated';
create index idx_places_region_kind on places(region_id, kind);
create index idx_programs_apply_end on programs(apply_end);

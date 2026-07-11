# 04 · 데이터베이스 스키마 (Supabase / PostgreSQL)

> 초안. 개발하며 조정. RLS(Row Level Security)는 사용자 데이터 테이블에 반드시 적용.

---

## 테이블 개요

| 테이블 | 층 | 설명 |
|--------|-----|------|
| `regions` | B | 지역 마스터 (관광공사 지역코드 매핑) |
| `programs` | A | 지자체 지원 프로그램 (자체 수집) |
| `places` | B | 관광지·숙소·병원·약국 등 장소 캐시 |
| `reviews` | C | 구조화 후기 (핵심 자산) |
| `courses` | C | 에디터/AI 추천 코스 |
| `profiles` | - | 사용자 프로필 (`role`로 관리자 구분) |
| `admin_audit` | - | 관리자 입력·검수 감사 로그 |

---

## SQL 초안

```sql
-- 지역 마스터
create table regions (
  id uuid primary key default gen_random_uuid(),
  area_code int not null,              -- 관광공사 지역코드
  sigungu_code int,                    -- 시군구코드
  name text not null,                  -- "충남 보령시"
  lat double precision,
  lng double precision,
  -- 시니어 관점 집계 지표 (배치로 갱신)
  hospital_count int default 0,
  pharmacy_count int default 0,
  avg_monthly_cost int,                -- 후기 기반 평균 한달실비(만원)
  created_at timestamptz default now()
);

-- 지자체 지원 프로그램 (자체 수집, API 없음)
create table programs (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id),
  title text not null,
  apply_start date,
  apply_end date,
  stay_start date,
  stay_end date,
  support_detail text,                 -- 지원내용
  eligibility text,                    -- 자격
  sns_required boolean default false,  -- SNS 홍보과제 유무
  apply_url text,
  source text,                         -- 출처(공고 링크)
  created_at timestamptz default now()
);

-- 장소 캐시 (관광공사/심평원 데이터 정제 저장)
-- ⚠️ 구글 Places는 place_id만 저장 가능. 리뷰/상세는 실시간 조회.
create table places (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id),
  content_id text,                     -- 관광공사 contentId
  google_place_id text,                -- 구글 place_id만 (평판 참고용)
  kind text not null,                  -- tour|stay|hospital|pharmacy|mart|festival
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  meta jsonb,                          -- 유형별 상세(운영시간/진료과목 등)
  source text default 'kto',           -- kto|hira|kakao
  updated_at timestamptz default now()
);

-- 구조화 후기 (핵심 자산)
-- origin으로 출처를 구분한다. 'user' 외 전부가 시딩(마중물).
-- ⚠️ origin이 곧 법적 근거다. 관리자 콘솔은 origin별로 다른 폼을 띄운다.
create type review_origin as enum (
  'user',        -- 서비스 사용자가 직접 작성 (본체)
  'public_doc',  -- 공공누리 제1유형 공공저작물에서 추출 (주력 시딩) · 원문 발췌 저장 가능
  'licensed',    -- 원저작자에게 개별 이용허락 받음 · 원문 저장 가능 · 동의서 보관 필수
  'curated',     -- 공개 자료에서 '사실'만 추출해 팀이 자기 문장으로 작성 · 원문 저장 금지
  'interview',   -- 참가자 인터뷰 후 팀이 구조화 입력 (본인 동의)
  'editor'       -- 에디터가 작성한 참고용
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id),
  origin review_origin not null default 'user',
  author_id uuid references profiles(id),  -- origin='user'일 때만 값 존재

  -- 구조화 별점 (1~5). ⚠️ 전부 nullable — 원문에 근거 없으면 null. 추정 기입 금지.
  medical_access smallint check (medical_access between 1 and 5),
  loneliness smallint check (loneliness between 1 and 5),
  transport smallint check (transport between 1 and 5),
  revisit smallint check (revisit between 1 and 5),
  monthly_cost int,                    -- 실제 한달실비(만원)
  summary text,                        -- 자유서술 / 원문 발췌
  tags text[],                         -- ["바다","조용함","의료좋음"]

  -- 출처
  source_org text,                     -- "보령시"
  source_year int,                     -- 2025
  source_title text,                   -- "2025 한달살기 결과보고서"
  source_url text,
  source_domain text,                  -- 'curated' 편중 감시용 (같은 사이트 반복 수집 = DB권 위험)
  source_license text                  -- 원문 저장을 정당화하는 근거. 이 둘 외에는 원문 저장 불가
    check (source_license is null or source_license in ('KOGL-1','CONSENT')),
  consent_doc_url text,                -- origin='licensed'일 때 동의서 파일 (비공개 버킷)

  -- 추출·검수 이력
  extracted_by text check (extracted_by in ('llm','human')),
  verified_by uuid references profiles(id),
  verified_at timestamptz,             -- 검수 전에는 공개하지 않는다

  created_at timestamptz default now(),

  -- 사용자 후기는 작성자와 필수 항목을 강제
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
  -- 큐레이션: 원문 저장 근거가 없으므로 라이선스 컬럼을 비워야 한다.
  -- summary는 팀이 직접 쓴 문장이며, 길면 원문 복붙 의심 → 400자 상한.
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

-- 추천 코스 (에디터 선탑재 + AI 생성)
create table courses (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id),
  title text not null,
  origin text default 'ai',            -- editor|ai
  weeks jsonb,                         -- 주차별 일정 배열
  based_on_review_ids uuid[],          -- 근거 후기 id (RAG 투명성)
  created_at timestamptz default now()
);

-- 사용자 프로필
create table profiles (
  id uuid primary key references auth.users(id),
  nickname text,
  age_group text,                      -- 50s|60s|70s+
  role text not null default 'user'    -- 'admin'만 관리자 콘솔 접근 (lib/authz에서 검사)
    check (role in ('user','admin')),
  created_at timestamptz default now()
);

-- 관리자 행위 감사 로그 (누가 무엇을 어떤 근거로 넣었는가)
create table admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references profiles(id),
  action text not null,                -- 'review.create'|'review.verify'|'program.create'|...
  target_table text not null,
  target_id uuid,
  payload jsonb,                       -- origin·source_url·license 등 판단 근거 스냅샷
  created_at timestamptz default now()
);
```

---

## 인덱스 · RLS 메모
- `reviews(region_id)`, `places(region_id, kind)`, `programs(apply_end)` 인덱스 권장.
- `reviews`, `profiles`, `courses`(사용자 생성분)에 RLS 적용: 본인 데이터만 write, read는 공개 정책.
- `reviews` read 정책은 **검수 완료분만 공개**: `origin = 'user' or verified_at is not null`.
- `origin = 'public_doc'` 후기는 화면에 출처표시 배지(`source_org`·`source_year`·`source_title`·`source_url`)를 반드시 렌더링한다 — 공공누리 제1유형의 유일한 의무 조건.
- 별점 집계(`avg_*`)는 **null을 제외하고 평균**한다. null을 0으로 취급하면 지역 점수가 왜곡된다.
- `admin_audit`는 `role='admin'`만 insert·select. 관리자 콘솔의 모든 쓰기는 감사 로그를 남긴다.
- `curated` 후기는 `source_domain`별 건수를 주기 점검한다. 한 도메인에 편중되면 "반복적·체계적 수집"으로 DB제작자 권리 침해 위험이 생긴다.
- 배치(Edge Function)로 `regions`의 집계 지표(hospital_count, avg_monthly_cost) 주기 갱신.

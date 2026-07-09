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
| `profiles` | - | 사용자 프로필 |

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
create table reviews (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id),
  author_id uuid references profiles(id),  -- 시딩 후기는 null
  is_seed boolean default false,           -- 큐레이션 시딩 여부
  -- 구조화 별점 (1~5)
  medical_access smallint check (medical_access between 1 and 5),
  loneliness smallint check (loneliness between 1 and 5),
  transport smallint check (transport between 1 and 5),
  revisit smallint check (revisit between 1 and 5),
  monthly_cost int,                    -- 실제 한달실비(만원)
  summary text,                        -- 자유서술
  tags text[],                         -- ["바다","조용함","의료좋음"]
  source text,                         -- 시딩 시 출처 표기(필수)
  created_at timestamptz default now()
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
  created_at timestamptz default now()
);
```

---

## 인덱스 · RLS 메모
- `reviews(region_id)`, `places(region_id, kind)`, `programs(apply_end)` 인덱스 권장.
- `reviews`, `profiles`, `courses`(사용자 생성분)에 RLS 적용: 본인 데이터만 write, read는 공개 정책.
- 시딩 후기(`is_seed=true`)는 `source` NOT NULL 강제(출처 표기 의무).
- 배치(Edge Function)로 `regions`의 집계 지표(hospital_count, avg_monthly_cost) 주기 갱신.

-- 산림청(한국등산트레킹지원센터) 100대명산 참조 테이블.
-- 지역 순회 수집이 아니라 전국 고정 목록(100개)이라 지역과 독립. 주소로 지역에 매칭한다.
--
-- ⚠️ 테이블명 주의: 이 Supabase 프로젝트는 여러 프로젝트가 공유하며,
--   블랙야크 트래커가 이미 `mountains` 테이블을 쓴다(그 프로젝트 소유·건드리지 말 것).
--   그래서 우리는 `forest_mountains`로 분리한다.
-- ⚠️ 키는 frtrl_id(산식별자). mtn_cd는 유일하지 않다 — 서로 다른 산이 같은 코드를
--   공유하는 경우가 있다(월출산=유명산 등, 정부 API 데이터 특성. 실호출 확인).
-- ⚠️ 출처: 정부(산림청) 공식 100대명산. 블랙야크 등 민간 브랜드 리스트가 아니다(공공누리 자유이용).
create table if not exists forest_mountains (
  frtrl_id text primary key,           -- 산식별자 (유일)
  mtn_cd text,                         -- 산코드 (유일하지 않음)
  name text not null,                  -- frtrlNm
  province text,                       -- ctpvNm (시도)
  address text,                        -- addrNm (전체 주소 — 지역 매칭 근거)
  lat double precision,
  lng double precision,
  altitude double precision,           -- aslAltide (해발고도 m)
  updated_at timestamptz not null default now()
);

create index if not exists idx_forest_mountains_address
  on forest_mountains using gin (to_tsvector('simple', address));

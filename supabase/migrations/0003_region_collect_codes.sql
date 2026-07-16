-- 수집 배치가 지역별 코드를 DB에서 읽도록 심평원 코드 컬럼 추가.
-- KTO 코드는 기존 area_code / sigungu_code 사용. 심평원은 코드 체계가 달라 별도 저장.
alter table regions
  add column if not exists hira_sido_cd text,
  add column if not exists hira_sggu_cd text;

comment on column regions.sigungu_code is 'KTO 시군구코드 (areaBasedList2용)';
comment on column regions.hira_sido_cd is '심평원 시도코드 (병원/약국 조회용)';
comment on column regions.hira_sggu_cd is '심평원 시군구코드';

-- 지역 중복 방지 + upsert 가능하게 (area_code, sigungu_code) 유니크.
alter table regions
  add constraint regions_area_sigungu_uniq unique (area_code, sigungu_code);

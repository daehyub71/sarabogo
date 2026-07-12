-- RLS(Row Level Security) — 심층 방어(2차 경계).
-- 1차 경계는 애플리케이션 레이어(src/lib/authz.ts)다. RLS는 그 아래를 받친다.
-- 배치(Edge Function)는 service_role로 우회하며 places/regions만 쓴다.

-- ── 프로필 ────────────────────────────────────────
alter table profiles enable row level security;

create policy profiles_read_all on profiles
  for select using (true);

create policy profiles_write_self on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── 후기 ──────────────────────────────────────────
alter table reviews enable row level security;

-- 공개 기준: 사용자 후기 또는 검수 완료분만. 미검수 시딩은 비공개 (FR-2.6).
create policy reviews_read_public on reviews
  for select using (origin = 'user' or verified_at is not null);

-- 사용자 후기 작성: 로그인 + 본인 명의 + origin='user'만.
-- 시딩(public_doc 등)은 service_role(관리자 콘솔 서버)로만 들어온다.
create policy reviews_insert_own on reviews
  for insert with check (
    origin = 'user' and auth.uid() = author_id
  );

create policy reviews_update_own on reviews
  for update using (origin = 'user' and auth.uid() = author_id)
  with check (origin = 'user' and auth.uid() = author_id);

create policy reviews_delete_own on reviews
  for delete using (origin = 'user' and auth.uid() = author_id);

-- ── 코스 ──────────────────────────────────────────
alter table courses enable row level security;

create policy courses_read_all on courses
  for select using (true);

-- ── 감사 로그 ─────────────────────────────────────
-- 관리자만 조회. 쓰기는 service_role(서버)만 하므로 정책을 열지 않는다.
alter table admin_audit enable row level security;

create policy admin_audit_read_admin on admin_audit
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- regions/programs/places는 공개 읽기 전용(배치가 service_role로 씀).
alter table regions enable row level security;
create policy regions_read_all on regions for select using (true);

alter table programs enable row level security;
create policy programs_read_all on programs for select using (true);

alter table places enable row level security;
create policy places_read_all on places for select using (true);

# TASK · 살아보고 (SARABOGO) 작업 체크리스트

> SDD 3단계 문서. `PLAN.md`의 Phase를 실행 단위로 분해한 것.
> **각 항목은 완료 즉시 체크한다.** Phase 완료 시 하단 이력에 완료 일시를 기록한다.
> 구현은 TDD(Red → Green → Refactor). 테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다.

**현재 상태:** Phase 0 코드 스캐폴딩 완료 (2026-07-11). 외부 키·배포 대기. 다음: 키 발급 → 마이그레이션 실적용 → Phase 1.

---

## Phase 0 — 셋업

**완료 조건:** `regions`에 시드 지역 1건이 들어가고, `lib/kto.ts`가 `MobileApp`을 부착해 관광공사 API를 1회 성공 호출한다. `DbPort`가 인메모리 페이크로도 전 테스트를 통과한다. Lighthouse PWA "설치 가능" 판정.

> **진행(2026-07-11):** 코드 스캐폴딩 완료. lint·typecheck·test·build 모두 통과(29 테스트).
> 남은 것은 전부 **외부 키·서비스·배포**가 필요한 항목(⏳ 표시).

### 계정·키 발급 (코드보다 먼저 — 리드타임 있음)
- [ ] ⏳ 공공데이터포털 가입 및 관광공사 TourAPI 4.0 **개발계정** 신청
- [ ] ⏳ 심평원 병원정보서비스 · 의료기관별상세정보서비스 · 약국정보조회 신청
- [ ] ⏳ 카카오 개발자 앱 생성 (REST API 키 + JS 키, 도메인 제한 설정)
- [ ] ⏳ Anthropic API 키 발급 (**Q1 확정: Claude**, `LLM_PROVIDER=anthropic`)
- [ ] ⏳ Supabase 프로젝트 생성
- [x] `.env.example` 작성 (`SPEC.md` §7 목록 전부) — `.env.local`은 키 확보 후

### 스캐폴딩
- [x] Next.js(App Router) + TypeScript 프로젝트 생성
- [x] vitest + testing-library 설정, `npm run validate` (lint + tsc --noEmit + test) 스크립트 정의
- [ ] ⏳ 카카오맵 JS SDK 로더 + `MapView.tsx` 최소 렌더 확인 (KAKAO_JS_KEY 필요)
- [ ] ⏳ Vercel 프로젝트 연결 (프리뷰 배포 확인)

### 포트 & 어댑터 (교체 가능성 — C-5·C-6)
- [x] `src/types/domain.ts` 도메인 타입 정의 (`Region`, `Review`, `Course` — 벤더 타입 무관)
- [x] `lib/db/port.ts` — `DbPort` 인터페이스 (도메인 타입만 주고받음)
- [x] `lib/db/adapters/supabase.ts` — 기본 구현 (`@supabase/*` import는 여기서만)
- [x] `lib/db/adapters/memory.ts` — 인메모리 페이크
- [x] **[Red→Green]** 동일 계약(`runDbContract`)이 memory 통과. supabase는 자격증명 있을 때 동일 계약 실행(gated skip) — R12
- [x] `lib/llm/port.ts` — `LlmPort` + Zod 응답 스키마 (공급자 무관 환각 방어)
- [x] `lib/llm/adapters/anthropic.ts` · `openai.ts` — `LLM_PROVIDER` 환경변수로 선택
- [x] ESLint `no-restricted-imports` — `adapters/` 밖에서 벤더 SDK import 차단 (C-5, 음성 테스트로 확인)

### 인가 (DB 추상화의 대가 — R11)
- [x] `lib/authz.ts` — 후기 write 인가 1차 경계 (DB 무관) + `lib/reviews.ts` 서비스 결합
- [x] **[Red→Green]** 타인 후기 수정·삭제 차단 테스트 — 인메모리 어댑터에서 통과 확인
- [x] RLS 정책은 심층 방어(2차)로 유지 (`0002_rls.sql`)

### DB
- [x] `04-database.md` 스키마로 마이그레이션 작성 (`supabase/migrations/0001_init.sql`)
- [x] `review_origin` enum(6종) + `reviews_user_shape` / `public_doc` / `licensed` / `curated` CHECK 제약 (R6·R8·R14)
- [x] `profiles.role` + `admin_audit` 테이블 — 동의서용 비공개 버킷은 ⏳ Supabase 생성 후
- [x] 인덱스: `reviews(region_id)`, `places(region_id, kind)`, `programs(apply_end)`, `reviews(source_domain)`
- [x] RLS 정책 (`0002_rls.sql`) — write 본인만, read 공개(검수분만)
- [ ] ⏳ 마이그레이션 실 적용 + 시드 지역 1건 삽입 후 조회 확인 (Supabase 프로젝트 필요)

### PWA · UI 기반
- [x] `public/manifest.json` + 서비스워커(`sw.js`) + 등록 컴포넌트
- [x] **앱 아이콘 제작 (2026-07-12)** — `assets/brand/icon.svg` 원본 → PNG 192·512·maskable512 + favicon32.
      카카오 개발자 앱 아이콘 업로드용: `assets/brand/sarabogo-app-icon-512.png`
- [ ] ⏳ Lighthouse PWA "설치 가능" 판정 확인 (배포 후)
- [x] `styles/tokens.css` — 시니어 타이포(본문 18px+)·대비 4.5:1 토큰 단일 출처 (FR-UI.4). Tailwind v4 `@theme`
- [x] **블랙야크 트래커 UI 수확** — Badge·Tag·SegmentedControl·StarRating·`cn` 이식(테스트 포함)
- [x] `RegionCard` — 생활지표 우선(병원·한달실비·후기·별점) + null "정보 없음" 노출 (FR-1.2)
- [x] `FeedList` + "더 보기" 버튼 — 무한 스크롤 금지, 10개 단위 (FR-UI.2)
- [ ] `BottomTabBar` — 아이콘 + 한글 레이블 (FR-UI.3) — Phase 1 진입 시
- [ ] 블랙야크 `BottomSheet`·`FilterBar` 추가 이식 — Phase 1 지도/필터 시
- [x] 모바일 퍼스트 레이아웃 · safe-area · 터치 타겟 48px 기준선 (globals.css)

### 관광공사 클라이언트 (최우선)
- [x] **[Red→Green]** `lib/kto.ts` — 모든 요청에 앱 식별자 `MobileApp=sarabogo` 부착 검증(9 테스트) + 재시도·오류 처리
- [x] **`areaCode2` 실키 호출 성공 (2026-07-12)** — `resultCode 0000`, 서울·인천·대전 수신. [kto.integration.test.ts](../tests/lib/kto.integration.test.ts)
- [x] **🔥 실호출로 잡은 버그 2건 (문서 규칙 자체가 틀렸음)**
  - `AppName` 파라미터는 **TourAPI에 존재하지 않는다** → 보내면 `resultCode 10`으로 **모든 호출 실패**. `MobileApp`으로 정정
  - KorService2는 **성공=중첩(`response.header`) / 오류=평평(`{resultCode}`)** 이라 중첩만 검사하면 오류를 성공으로 오인 → 양쪽 검사로 수정
- [x] 팀 규칙: 관광공사 호출은 `lib/kto.ts`만 경유 — lint로 강제(직접 fetch 시 리뷰에서 차단)

---

## Phase 1 — 탐색 지도 (F1)

**완료 조건:** 시드 지역 10곳에서 지도에 병원·약국·관광지 마커가 뜨고, 카드에 병원 접근 시간이 표시된다.

### 선행 결정
- [ ] **Q2** 시딩 대상 지역 10~20곳 확정 — **공공누리 제1유형 발간물 보유 지역 우선**(방침 확정). 후보 조사 → 발간물 유무로 압축
- [ ] **Q4** 병원 접근 시간 산출 방식 결정 (직선거리 근사로 시작)

### 수집 배치
- [ ] `regions` 시드 데이터 입력 (Q2 결과 반영)
- [ ] Edge Function: 관광공사 `areaBasedList2` / `searchStay2` → `places` 정제 저장
- [ ] **[Red→Green]** `lib/geocode.ts` — 주소 → 좌표 변환 (실패 건 로깅)
- [ ] **[Red→Green]** `lib/hira.ts` — 심평원 병원·약국 조회
- [ ] Edge Function: 심평원 + 지오코딩 → `places` (kind = hospital|pharmacy)
- [ ] 지오코딩 실패 건 수기 보정 목록 산출 (R3)
- [ ] Cron 스케줄 등록 (야간 1회)
- [ ] `regions.hospital_count` · `pharmacy_count` 집계 갱신 배치

### 화면
- [ ] 랜딩 `page.tsx` — 큰 버튼 3종 (바다 근처 / 병원 가까운 곳 / 저예산)
- [ ] `RegionCard.tsx` — 병원 접근 시간 · 평균 한달실비 · 후기 수 · 별점 (후기 지표는 placeholder)
- [ ] `regions/[id]/page.tsx` — 지역 상세
- [ ] `MapView.tsx` — 종류별 마커 구분 (관광지/숙소/병원/약국/마트)
- [ ] 무장애 관광정보 노출 (FR-1.4)
- [ ] 시니어 UX 점검: 본문 18px↑, 터치영역 48px↑, 대비 4.5:1↑

---

## Phase 2 — 구조화 후기 (F2)

**완료 조건:** 로그인 사용자의 후기 작성이 지역 카드 별점·후기 수에 반영된다. `public_doc` 후기는 전부 출처표시 4종 + 검수 이력을 갖고, null 항목이 "정보 없음"으로 노출된다.

### 시딩 (Phase 1과 병렬 착수 — 문서 선별·검수가 병목)

**① 문서 선별 — 여기서 놓치면 뒤가 전부 무효**
- [ ] **Q6** 선별 체크리스트 확정: 공공누리 유형 확인 + "제3자 저작권 포함" 표시 확인
- [ ] 지자체 한달살기 결과보고서·체험수기 수집 (기관명·연도·저작물명·URL 기록)
- [ ] **제1유형(`KOGL-1`)만 채택** — 제2·4유형 폐기 (R8)
- [ ] 참가자 개인 수기가 제3자 저작권 제외 범위에 걸리는지 건별 확인 → 걸리면 폐기

**② LLM 추출 (자동)**
- [ ] 추출 프롬프트 작성 — **"원문에 근거 없는 항목은 반드시 null. 추정 금지"** 명시 (제약 C-2.1)
- [ ] 추출 스크립트 — 원문 → 별점 5항목 + 태그 + 발췌 요약 (JSON only)
- [ ] 별점이 전부 채워진 추출 건은 표본 검수 (환각 의심 신호 — R9)

**③ 사람 검수 → 적재**
- [ ] 검수 UI 또는 시트 — 원문 대조 후 `verified_by`/`verified_at` 기록
- [ ] 지역당 3~5건 · 총 50~80건 적재 (`origin='public_doc'`)
- [ ] 출처표시 4종 전수 점검 (누락 0건 — R6)
- [ ] **Q5 판정 (시딩 30건 시점)** — null 과다로 RAG 근거 부족하면 참가자 인터뷰 확대. 추정 기입은 금지 (R10)

**④ 참가자 인터뷰 (보완)**
- [ ] 한달살기 참가자 5~10명 인터뷰 → `origin='interview'` 구조화 입력

**⑤ 개별 이용허락 · 사실 큐레이션 (보완)**
- [ ] **Q10** 이용허락 요청 블로거 선정 + 동의서 양식 작성
- [ ] 동의 확보분 → `origin='licensed'` (동의서 업로드 필수)
- [ ] **Q9** `curated` 출처 도메인당 상한 확정 (DB권 방어선 — R15)
- [ ] 공개 자료에서 **사실만** 추출 → `origin='curated'` (원문 문장 저장 금지 — C-9)

### 관리자 콘솔 (F5 — 시딩의 전제, Phase 2 최우선)
- [ ] `profiles.role` + `lib/authz` 관리자 검사 (FR-5.1)
- [ ] **[Red]** 비관리자의 `/admin` 접근 차단 테스트 (인메모리 어댑터에서도 통과)
- [ ] `admin/reviews/new` — **origin 선택 → 분기 폼** (FR-5.2)
  - [ ] `public_doc`: 출처 4종 + 공공누리 유형 select · **제1유형에서만 저장 활성** · 제3자 저작권 확인 체크
  - [ ] `licensed`: 원문 URL + **동의서 업로드 필수** (비공개 버킷)
  - [ ] `curated`: **원문 붙여넣기 필드 없음** · 사실 항목만 + `source_url`/`source_domain` · 총평 400자 상한
  - [ ] `interview`: 대상자 동의 확인
- [ ] **[Red]** origin별 DB CHECK 위반 시 저장 실패 테스트 (`licensed` 동의서 누락, `curated` 401자 등)
- [ ] `admin/reviews/verify` — 검수 큐, 승인 시 `verified_by`/`verified_at` 기록 (FR-5.5)
- [ ] `admin_audit` 기록 — 모든 쓰기에 행위자·근거 스냅샷 (FR-5.6)
- [ ] `curated` 출처 도메인 편중 경고 위젯 (FR-5.4 · R15) — **Q9 상한 확정 후**
- [ ] `admin/programs` — A층 지원 프로그램 입력 (FR-5.7)
- [ ] `admin/geocode` — 지오코딩 실패 좌표 수기 보정 (R3)

### 기능
- [ ] Supabase Auth 로그인 (후기 작성 시점에만 요구)
- [ ] `profiles` 생성 트리거 / `age_group` 입력
- [ ] **[Red]** 후기 저장 로직 테스트 — 별점 범위(1~5), `origin` 별 제약(`reviews_user_shape` / `reviews_public_doc_shape`)
- [ ] **[Red]** `source_license`가 `KOGL-1`이 아니면 저장 실패하는지 테스트
- [ ] **[Green]** `ReviewForm.tsx` — 별점 5항목 + 한달실비 + 태그 + 자유서술
- [ ] 5분 내 작성 가능한지 실제 측정 (시니어 UX 검증)
- [ ] 지역별 후기 목록·집계 표시 + **null 항목 "정보 없음" 노출** (FR-2.5)
- [ ] `public_doc` 후기 카드에 출처표시 배지 렌더링 (FR-2.7)
- [ ] `regions.avg_monthly_cost` 및 평균 별점 집계 배치 — **null 제외 평균** (0 치환 금지)
- [ ] RLS 동작 검증 — 타인 후기 write 차단 + **미검수 시딩 후기 read 차단**(FR-2.6)

### 운영계정 (9월 초 — 리드타임 1주)
- [ ] 관광공사 API 호출 로그 확보 상태 점검
- [ ] 실서비스 URL 확보 (Vercel 프로덕션)
- [ ] **운영계정 신청**

---

## Phase 3 — RAG 추천 (F3)

**완료 조건:** 조건 입력 시 4주차 코스가 나오고, 각 항목에 근거 후기 카드가 붙는다.

- [x] **Q1** LLM 공급자 확정 → **Claude** (2026-07-11)
- [ ] 조건 입력 UI — 예산 · 건강 배려 · 관심사 태그
- [ ] **[Red]** `/api/recommend` 테스트 — LLM mock으로 응답 스키마 검증
- [ ] 후기 쿼리: 조건에 맞는 지역의 구조화 후기 조회 (예: 의료접근성 ★4↑)
- [ ] 프롬프트 구성 — 후기 근거 + 관광정보 근거 주입, JSON only 강제 (`03-reviews.md` 골격)
- [ ] **[Green]** LLM 호출 → 주차별 코스 + 참조 후기 id 반환
- [ ] **근거 후기 id 실존 검증** — DB에 없는 id를 반환하면 재시도 (R4)
- [ ] 스키마 위반 시 1회 재시도 → 실패 시 에디터 코스 폴백
- [ ] `CourseResult.tsx` — 코스 + 근거 후기 카드 함께 렌더링
- [ ] 에디터 추천 코스 선탑재 (`origin = 'editor'`, 지역당 1건)
- [ ] 후기 부족 지역에서 빈 결과가 나오지 않는지 확인 (FR-3.5)

---

## Phase 4 — 공유 & 마감 (F4)

**완료 조건:** 공개 URL에서 비로그인 사용자가 공유 링크를 열람할 수 있고, 법적 고지가 모두 게시되어 있다.

- [ ] 추천 결과 고유 URL (비로그인 열람 가능)
- [ ] 카카오 공유 SDK — 결과 카드 전송
- [ ] 관광공사 출처 표기 (푸터 + 이미지 상세)
- [ ] 개인정보처리방침 · 이용약관 페이지
- [ ] Vercel 프로덕션 배포
- [ ] 운영계정 승인 확인

---

## 심사 전 최종 점검 (10월)

`05-roadmap.md` 리스크 체크리스트와 동일.

- [ ] 관광공사 운영계정 승인 완료
- [ ] 시딩 후기 출처 표기 누락 0건 (`origin='public_doc'` 전건)
- [ ] 시딩 후기 중 공공누리 제1유형 외 저작물 0건
- [ ] 미검수(`verified_at is null`) 후기가 화면에 노출되지 않음
- [ ] 구글 리뷰 DB 저장 없음 (`place_id`만)
- [ ] API 키 클라이언트 노출 없음 — 빌드 번들 검사 (`KAKAO_JS_KEY` 제외, 도메인 제한 확인)
- [ ] 관광공사 이미지 출처 표기
- [ ] **Q3** 경쟁사(한달살러) 후기 기능 재확인 — 2026년 7월 조사 기준
- [ ] PT 데모 시나리오 리허설 (김정숙 씨 여정: 발견 → 탐색 → 신뢰 → 결정 → 기여)

---

## Phase 완료 이력

| Phase | 완료 일시 | 비고 |
|-------|-----------|------|
| 문서 정리 | 2026-07-09 | SDD 3종 작성, 프로젝트 구조 확정 |
| Phase 0 | | |
| Phase 1 | | |
| Phase 2 | | |
| Phase 3 | | |
| Phase 4 | | |

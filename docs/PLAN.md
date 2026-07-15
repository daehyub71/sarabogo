# PLAN · 살아보고 (SARABOGO) 개발 계획서

> SDD 2단계 문서. `SPEC.md` 확정 후 작성. **이 문서 없이 구현을 시작하지 않는다.**
> Phase별 세부 작업과 진행 상태는 `TASK.md`에서 추적한다.

---

## 1. 마일스톤 (공모 일정 정렬)

| 시기 | 공모 단계 | 개발 목표 | 산출물 |
|------|-----------|-----------|--------|
| 7월 말 | 예비심사·OT | 기획 확정, 시드 DB 착수, 스캐폴딩 | Phase 0 완료 |
| 8월 | 서비스 개발 | 탐색(지도) 완성 | Phase 1 완료 |
| 9월 초 | — | 후기 + 시딩 50~80건 | Phase 2 완료 · **운영계정 신청** |
| 9월 말 | — | RAG 추천 동작 | Phase 3 완료 |
| 10월 초 | 1차 심사 | 공유·법적 고지·배포 | Phase 4 완료 |
| 10월 중 | 최종 심사 | PT | 데모 시나리오 리허설 |
| 11월 중 | 시상식 | — | — |

> **크리티컬 패스는 운영계정이다.** 승인에 약 1주가 걸리고 개발 로그를 요구하므로,
> Phase 0에서 개발계정 발급 → 꾸준히 호출 로그를 쌓아 → 9월 초 신청한다. 이 순서가 어긋나면 10월에 막힌다.

---

## 2. 아키텍처

```
[브라우저 · PWA (설치형 웹앱)]
    │  피드 카드 / 지도 / 후기 폼 / 추천 결과   ← 하단 탭 4종
    ▼
[Next.js App Router · Vercel]
    ├── Server Component ── lib/db (포트) 로 조회 (지역·후기·코스 읽기)
    └── Route Handler
          ├── /api/tour/*      → lib/kto.ts    → 관광공사 TourAPI  (MobileApp 주입)
          ├── /api/medical/*   → lib/hira.ts   → 심평원 API
          └── /api/recommend   → ① lib/db 로 후기 쿼리
                                 ② 후기 + 관광정보를 프롬프트에 주입
                                 ③ lib/llm (포트) 호출 → 코스 + 근거 후기 id

  ── 포트 & 어댑터 경계 ─────────────────────────────
    lib/db  (포트: DbPort)        lib/llm  (포트: LlmPort)
       └ adapters/supabase.ts        ├ adapters/anthropic.ts
         (기본 · 유일 구현)          └ adapters/openai.ts
                                     선택: env LLM_PROVIDER
    ▼
[Supabase · PostgreSQL]
    regions / programs / places / reviews / courses / profiles
    ▲
[Edge Functions + Cron · 야간 배치]
    ├── 관광공사 areaBasedList2 / searchStay2 → places
    ├── 심평원 병원·약국 + 지오코딩          → places
    └── 집계 갱신 (hospital_count, avg_monthly_cost) → regions
```

### 핵심 설계 결정

| 결정 | 이유 |
|------|------|
| **화면은 외부 API를 직접 호출하지 않는다.** 배치가 `places`에 정제 저장하고, 화면은 `lib/db`만 읽는다 | 응답 지연·API 쿼터·장애 전파를 한 번에 차단. LCP 2.5초 목표의 전제 |
| **외부 API 호출은 전부 `lib/` 클라이언트를 경유한다.** `fetch`를 직접 쓰지 않는다 | 앱 식별자 `MobileApp=sarabogo` 누락 방지 (운영계정 승인 요건). 재시도·에러 처리 일원화 |
| **RAG 컨텍스트는 서버에서만 구성한다** | 후기 원문·프롬프트가 클라이언트에 노출되지 않게 |
| **LLM은 포트+어댑터.** 공급자는 `LLM_PROVIDER` 환경변수로 교체 | Q1(Claude vs OpenAI)이 미결. 응답 스키마 검증(Zod)을 포트에 두어 공급자와 무관하게 환각 방어 |
| **DB도 포트+어댑터.** 화면·API는 `DbPort` 인터페이스만 안다 | 사용자 요구(교체 가능성). 어댑터는 당분간 Supabase 하나뿐이며, 두 번째 어댑터는 필요해질 때 쓴다 |
| **인가는 애플리케이션 레이어가 1차 경계, RLS는 심층 방어(2차)** | DB를 추상화하면 RLS가 유일 경계가 될 수 없다. 어댑터를 갈아끼워도 인가는 살아 있어야 한다 |
| **PWA로 출발.** React Native 병행하지 않는다 | 2~3인이 10월까지 두 벌을 유지할 수 없다. manifest + 서비스워커로 설치형 경험 확보 |
| Cloud Run 미사용 | `SPEC.md` §5 참조 |

> **어댑터 함정 주의.** "DB 교체 가능"은 인터페이스가 특정 DB 기능을 새어나오게 하지 않을 때만 참이다.
> `DbPort`는 Postgres 방언·Supabase 클라이언트 타입을 시그니처에 노출하지 않는다. 노출하는 순간 추상화는 장식이 된다.

---

## 3. 모듈 의존관계

```
              types/            ← 모든 모듈이 참조 (순환 없음)
                 ▲
     ┌───────────┼───────────┐
  lib/kto     lib/hira    lib/geocode      (외부 API 어댑터)
     └───────────┬───────────┘
                 ▼
        lib/db (DbPort)   lib/llm (LlmPort)     ← 포트: 인터페이스만
            │                  │
     adapters/supabase   adapters/anthropic     ← 어댑터: 여기서만 벤더 SDK import
                         adapters/openai
                 ▼
           lib/authz                             (인가 1차 경계 · DB 무관)
                 ▼
    ┌────────────┼────────────┐
 app/api      app/(pages)   supabase/functions
                 ▼
           components/
```

**의존 방향 규칙**

- 벤더 SDK(`@supabase/*`, `@anthropic-ai/*`, `openai`)는 **`adapters/` 안에서만 import**한다.
  `app/`·`components/`에서 이 패키지들이 보이면 추상화가 이미 깨진 것이다. lint 규칙(`no-restricted-imports`)으로 막는다.
- 포트 시그니처는 도메인 타입(`Review`, `Region`)만 쓴다. `PostgrestError` 같은 벤더 타입을 반환하지 않는다.

**빌드 순서상 먼저 존재해야 하는 것**

1. `types/` — 도메인 타입. 나머지 전부가 여기 의존한다.
2. `lib/kto.ts` — 앱 식별자(`MobileApp`) 주입 유틸. **다른 어떤 관광공사 호출보다 먼저 작성한다** (제약 C-1).
3. `lib/db` 포트 + Supabase 어댑터 + 마이그레이션 — 배치와 화면 양쪽의 전제.
4. `lib/authz` — 후기 write 인가. Phase 2 이전에 존재해야 한다.

⚠️ **정정(2026-07-12, 실호출):** 심평원 병원·약국 응답은 `XPos`(경도)·`YPos`(위도)를 **직접 포함**한다.
따라서 `lib/geocode`는 `lib/hira`의 선행 조건이 **아니다.** 병원·약국 마커는 지오코딩 없이 바로 찍는다.
지오코딩은 좌표가 없는 대상(A층 프로그램 숙소 주소 등)에만 쓴다. `lib/geocode`는 카카오+테이블(fallback) 어댑터로 격리했다.

> 배치(Edge Functions)는 Deno 런타임이라 `lib/db` 어댑터를 그대로 공유하기 어렵다.
> 배치는 service_role로 Supabase에 직접 쓰되, **`places`·`regions` 쓰기 전용**으로 범위를 제한한다. 사용자 데이터에 손대지 않는다.

---

## 4. Phase별 구현 범위

### Phase 0 — 셋업 (1주)

| 범위 | 내용 |
|------|------|
| 포함 | Next.js(App Router) + 카카오맵 스캐폴딩 / 개발계정 키 발급 / DB 마이그레이션 / `lib/kto.ts` MobileApp 주입 유틸 / **`DbPort` + Supabase 어댑터** / **`LlmPort` + 어댑터 2종** / **`lib/authz`** / PWA manifest + 서비스워커 / 디자인 토큰(시니어 대비·타이포) / 테스트 환경(vitest) |
| 제외 | 실제 데이터 수집, 화면 디자인 구현 |
| 완료 조건 | `regions`에 시드 지역 1건이 들어가고, `lib/kto.ts`가 `MobileApp`을 부착해 관광공사 API를 1회 성공 호출한다. **`DbPort`가 인메모리 페이크 어댑터로도 통과하는 테스트가 있다** (추상화가 실제로 성립함을 증명). Lighthouse PWA 설치 가능 판정 |

### Phase 1 — 탐색 지도 (2~3주) · F1

| 범위 | 내용 |
|------|------|
| 포함 | 관광공사 지역기반/위치기반 수집 배치 → `places` / 심평원 + 지오코딩 → 병원·약국 마커 / 지역 카드 UI / 큰 버튼 3종 진입 / 무장애 관광정보 노출 |
| 제외 | 후기 관련 지표(카드의 후기 수·별점 자리는 placeholder) |
| 완료 조건 | 시드 지역 10곳에 대해 지도에 병원·약국·관광지 마커가 뜨고, 카드에 병원 접근 시간이 표시된다 |
| 의존 | Phase 0 (`lib/kto`, `lib/supabase`, 스키마) |

> Q4(병원 접근 시간 산출 방식)를 이 Phase 초반에 결정한다. 직선거리 근사로 시작하고, 여유가 있으면 카카오 길찾기로 교체한다.

### Phase 2 — 구조화 후기 (2주) · F2

| 범위 | 내용 |
|------|------|
| 포함 | **관리자 콘솔(F5): origin별 분기 폼 + 검수 큐 + 감사 로그** / 후기 폼(별점 5항목 + 태그 + 서술) / Supabase Auth 로그인 / RLS 정책 / 시딩 50~80건 입력(LLM 추출 + 사람 검수) / 출처표시 배지 / 지역별 집계 배치 |
| 제외 | 후기 신고·수정·삭제 UI |
| 완료 조건 | 로그인 사용자가 후기를 작성하면 지역 카드의 별점·후기 수가 갱신된다. `public_doc` 후기는 전부 출처표시 4종 + 검수 이력을 갖는다. null 항목이 "정보 없음"으로 노출된다 |
| 의존 | Phase 1 (`regions` 확정) |

> **관리자 콘솔(F5)은 Phase 2 최우선.** 시딩·검수의 전제이고, A층 프로그램 입력과 지오코딩 보정도 여기서 한다.
> 콘솔이 없으면 시딩이 SQL 수기 입력이 되고, 그 순간 origin별 제약이 사람의 기억력에 의존하게 된다.

> **시딩은 개발과 병렬로 진행한다.** Phase 1 시작 시점에 착수해 Phase 2 종료까지 끝낸다.
>
> 시딩 파이프라인: **문서 선별(공공누리 제1유형 확인) → LLM 추출(근거 없으면 null) → 사람 검수 → 적재.**
> 문서 선별과 검수가 병목이며, 추출은 자동이다. 선별 단계에서 유형·제3자 저작권을 놓치면 뒤가 전부 무효다.

### Phase 3 — RAG 추천 (2주) · F3

| 범위 | 내용 |
|------|------|
| 포함 | 조건 입력 UI / `POST /api/recommend` (후기 쿼리 → 프롬프트 주입 → LLM) / 근거 후기 렌더링 / 에디터 추천 코스 선탑재 |
| 제외 | 추천 결과 저장·재조회 히스토리 |
| 완료 조건 | 조건 입력 시 4주차 코스가 나오고, 각 항목에 근거 후기 카드가 붙는다. 후기 없는 지역은 에디터 코스로 대체된다 |
| 의존 | Phase 2 (후기 데이터가 실제로 존재해야 RAG가 성립) |

> Q1(LLM 공급자)을 이 Phase 착수 전에 확정한다. 프롬프트는 JSON only 응답을 강제하고, 스키마 검증 실패 시 1회 재시도한다.

### Phase 4 — 공유 & 마감 (1주) · F4

| 범위 | 내용 |
|------|------|
| 포함 | 카카오 공유 / 결과 공유 URL / 출처 표기 · 개인정보처리방침 · 이용약관 / Vercel 프로덕션 배포 / 운영계정 신청 마무리 |
| 완료 조건 | 공개 URL에서 비로그인 사용자가 공유 링크를 열람할 수 있고, 법적 고지가 모두 게시되어 있다 |

---

## 5. 디렉토리 구조

```
sarabogo/
├── CLAUDE.md
├── docs/
│   ├── SPEC.md  PLAN.md  TASK.md      # SDD 3종
│   └── 01-product.md ~ 05-roadmap.md  # 상세 부록
├── assets/                            # 제안덱 등 비코드 산출물
├── .env.local
├── public/
│   ├── manifest.json                  # PWA (설치형 웹앱)
│   └── icons/                         # 192·512 maskable
├── src/
│   ├── app/
│   │   ├── page.tsx                   # 랜딩 (큰 버튼 3종)
│   │   ├── regions/page.tsx           # 지역 피드 ("더 보기" 페이지네이션)
│   │   ├── regions/[id]/page.tsx      # 지역 상세 (지도 + 후기)
│   │   ├── recommend/page.tsx         # 조건 입력 → 코스
│   │   ├── admin/                     # 관리자 콘솔 (F5 · role='admin')
│   │   │   ├── reviews/new/page.tsx   #   origin 선택 → 분기 폼
│   │   │   ├── reviews/verify/page.tsx#   검수 큐
│   │   │   ├── programs/page.tsx      #   A층 공고 입력
│   │   │   └── geocode/page.tsx       #   지오코딩 실패 보정 (R3)
│   │   └── api/
│   │       ├── tour/route.ts          # 관광공사 프록시
│   │       ├── medical/route.ts       # 심평원 프록시
│   │       └── recommend/route.ts     # RAG 추천
│   ├── lib/
│   │   ├── db/
│   │   │   ├── port.ts                # DbPort 인터페이스 (도메인 타입만)
│   │   │   └── adapters/
│   │   │       ├── supabase.ts        # 기본 구현 (@supabase/* import는 여기서만)
│   │   │       └── memory.ts          # 테스트용 페이크 — 추상화 성립 증명
│   │   ├── llm/
│   │   │   ├── port.ts                # LlmPort · Zod 응답 스키마
│   │   │   └── adapters/
│   │   │       ├── anthropic.ts
│   │   │       └── openai.ts
│   │   ├── authz.ts                   # 인가 1차 경계 (DB 무관)
│   │   ├── kto.ts                     # 관광공사 클라이언트 (MobileApp 주입)
│   │   ├── hira.ts                    # 심평원 클라이언트
│   │   └── geocode.ts
│   ├── components/
│   │   ├── feed/                      # FeedCard  FeedList  LoadMoreButton
│   │   ├── nav/                       # BottomTabBar (아이콘 + 한글 레이블)
│   │   ├── RegionCard.tsx  ReviewForm.tsx  MapView.tsx  CourseResult.tsx
│   ├── styles/tokens.css              # 시니어 타이포·대비 토큰 (단일 출처)
│   └── types/
├── supabase/
│   ├── migrations/
│   └── functions/                     # Edge Functions (배치 수집 · places/regions 쓰기 전용)
└── tests/
```

---

## 6. 리스크

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | **운영계정 승인 지연** — 개발 로그·앱이름(MobileApp)·실서비스 URL 요구, 약 1주 소요 | 10월 심사 시 실데이터 시연 불가 | Phase 0부터 MobileApp 부착, 9월 초 신청. 승인 전에도 개발계정으로 데모 가능하도록 분리 |
| R2 | **후기 콜드스타트** — 초기 후기 0건이면 F3(RAG)가 성립하지 않음 | 핵심 차별점 붕괴 | 공공누리 제1유형 발간물 LLM 추출로 시딩. Phase 1과 병렬 착수. 에디터 추천 코스로 빈 화면 방어 |
| R3 | **좌표 없는 주소의 지오코딩 실패** — A층 프로그램 숙소 등 (병원·약국은 심평원이 좌표 제공, 해당 없음) | 지도 마커 누락 | 카카오 지오코딩 실패 시 `table` 어댑터로 수기 보정 큐(R3). 관리자 콘솔에서 처리 |
| R4 | **LLM 환각·JSON 스키마 위반** | 추천 신뢰도 붕괴 = 정체성 훼손 | 근거 후기 id를 응답에 강제, 서버에서 id 실존 검증. 위반 시 1회 재시도 후 에디터 코스로 폴백 |
| R5 | **구글 Places 정책 위반** — 실수로 리뷰를 캐싱 | 심사 감점·정책 위반 | `places` 테이블에 리뷰 컬럼 자체를 두지 않음(`google_place_id`만). 스키마로 실수를 봉쇄 |
| R6 | **시딩 후기 출처 누락** | 저작권 문제 | `origin='public_doc'`일 때 출처 4종 + `KOGL-1` + `verified_at` NOT NULL을 DB 제약으로 강제 |
| R8 | **공공누리 유형 오판** — 제2·4유형이나 제3자 저작권 포함 수기를 시딩 | 저작권 침해 · 심사 실격 | 문서 선별 체크리스트를 시딩 착수 전 확정(Q6). `source_license`는 `KOGL-1`만 CHECK 통과 |
| R9 | **LLM 추출의 추정 기입** — 근거 없는 별점을 채워 합성 후기가 됨 | 서비스 정체성 붕괴 | 프롬프트에 "근거 없으면 null" 강제 + 사람 검수 필수 + 검수 전 비공개(RLS). 별점 다 찬 추출 건은 표본 검수 |
| R10 | **null 과다** — 추출 결과 별점이 대부분 비어 RAG 근거 부족 | F3 품질 저하 | 시딩 30건 시점에 판정(Q5). 부족하면 참가자 인터뷰 확대. **추정 기입으로 메우지 않는다** |
| R7 | 2~3인 팀의 일정 압박 | Phase 지연 | MVP 4개 외 확장 기능은 로드맵 슬라이드로만 제시. 코드로 손대지 않는다 |
| R11 | **DB 추상화로 RLS가 유일 경계가 아니게 됨** — 인가 구멍 | 타인 후기 위변조 | `lib/authz`를 1차 경계로 두고 전용 테스트 작성. RLS는 심층 방어로 유지. 어댑터 교체 시에도 authz 테스트는 그대로 통과해야 한다 |
| R12 | **어댑터가 장식이 됨** — 벤더 타입이 포트로 새어나옴 | 교체 불가 · 추상화 비용만 지불 | `no-restricted-imports` lint로 `adapters/` 밖의 벤더 SDK import 차단. 인메모리 어댑터로 전 테스트 통과를 CI 조건화 |
| R13 | **인스타 UI 관습이 시니어 접근성과 충돌** (무한스크롤·아이콘 온리·저대비) | 주 타겟 이탈 · WCAG AA 미달 | "더 보기" 버튼 채택. 하단 탭은 아이콘+한글 레이블. 색·타이포는 `tokens.css` 단일 출처로 대비 4.5:1 강제 |
| R14 | **관리자 콘솔이 수동 크롤링 창구가 됨** — 블로그 원문을 손으로 붙여넣음 | 저작권·DB권 침해 (수단 무관) | `curated` 폼에 원문 입력 필드를 만들지 않음. `summary` 400자 상한을 DB CHECK로 강제. 모든 입력은 `admin_audit`에 근거 스냅샷과 함께 기록 |
| R15 | **`curated` 출처 편중** — 한 블로그·카페에서 다수 수집 | "반복적·체계적 복제" = DB제작자 권리 침해 (잡코리아 판례) | `source_domain` 기록 + 대시보드 경고. 도메인당 상한을 Q9로 확정 |

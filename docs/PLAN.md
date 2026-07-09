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
[브라우저]
    │  큰 버튼 3종 / 지도 / 후기 폼 / 추천 결과
    ▼
[Next.js App Router · Vercel]
    ├── Server Component ── Supabase 직접 조회 (지역·후기·코스 읽기)
    └── Route Handler
          ├── /api/tour/*      → lib/kto.ts    → 관광공사 TourAPI  (AppName 주입)
          ├── /api/medical/*   → lib/hira.ts   → 심평원 API
          └── /api/recommend   → ① Supabase에서 후기 쿼리
                                 ② 후기 + 관광정보를 프롬프트에 주입
                                 ③ LLM 호출 → 코스 + 근거 후기 id
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
| **화면은 외부 API를 직접 호출하지 않는다.** 배치가 `places`에 정제 저장하고, 화면은 Supabase만 읽는다 | 응답 지연·API 쿼터·장애 전파를 한 번에 차단. LCP 2.5초 목표의 전제 |
| **외부 API 호출은 전부 `lib/` 클라이언트를 경유한다.** `fetch`를 직접 쓰지 않는다 | `AppName=sarabogo` 누락 방지 (운영계정 승인 요건). 재시도·에러 처리 일원화 |
| **RAG 컨텍스트는 서버에서만 구성한다** | 후기 원문·프롬프트가 클라이언트에 노출되지 않게 |
| Cloud Run 미사용 | `SPEC.md` §5 참조 |

---

## 3. 모듈 의존관계

```
              types/            ← 모든 모듈이 참조 (순환 없음)
                 ▲
     ┌───────────┼───────────┐
  lib/kto     lib/hira    lib/geocode      (외부 API 어댑터)
     └───────────┬───────────┘
                 ▼
           lib/supabase                    (DB 접근)
                 ▼
    ┌────────────┼────────────┐
 app/api      app/(pages)   supabase/functions
                 ▼
           components/
```

**빌드 순서상 먼저 존재해야 하는 것**

1. `types/` — DB 스키마와 API 응답 타입. 나머지 전부가 여기 의존한다.
2. `lib/kto.ts` — AppName 주입 유틸. **다른 어떤 관광공사 호출보다 먼저 작성한다** (제약 C-1).
3. `lib/supabase.ts` + 마이그레이션 — 배치와 화면 양쪽의 전제.

`lib/geocode.ts`는 `lib/hira.ts`의 선행 조건이다. 심평원 병원 데이터가 주소 기반이라 좌표 변환 없이는 지도에 찍을 수 없다.

---

## 4. Phase별 구현 범위

### Phase 0 — 셋업 (1주)

| 범위 | 내용 |
|------|------|
| 포함 | Next.js(App Router) + Supabase + 카카오맵 스캐폴딩 / 개발계정 키 발급 / DB 마이그레이션 / `lib/kto.ts` AppName 주입 유틸 / 테스트 환경(vitest) |
| 제외 | 실제 데이터 수집, UI 디자인 |
| 완료 조건 | `regions` 테이블에 시드 지역 1건이 들어가고, `lib/kto.ts`가 AppName을 부착해 관광공사 API를 1회 성공 호출한다 (테스트로 검증) |

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
| 포함 | 후기 폼(별점 5항목 + 태그 + 서술) / Supabase Auth 로그인 / RLS 정책 / 시딩 50~80건 입력 / 지역별 집계 배치 |
| 제외 | 후기 신고·수정·삭제 UI |
| 완료 조건 | 로그인 사용자가 후기를 작성하면 지역 카드의 별점·후기 수가 갱신된다. 시딩 후기는 전부 `source`를 갖는다 |
| 의존 | Phase 1 (`regions` 확정) |

> **시딩은 개발과 병렬로 진행한다.** 50~80건을 사람이 읽고 재구성하는 작업이라 코드보다 오래 걸린다.
> Phase 1 시작 시점에 시딩 착수해서 Phase 2 종료까지 끝낸다.

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
├── src/
│   ├── app/
│   │   ├── page.tsx                   # 랜딩 (큰 버튼 3종)
│   │   ├── regions/[id]/page.tsx      # 지역 상세 (지도 + 후기)
│   │   ├── recommend/page.tsx         # 조건 입력 → 코스
│   │   └── api/
│   │       ├── tour/route.ts          # 관광공사 프록시
│   │       ├── medical/route.ts       # 심평원 프록시
│   │       └── recommend/route.ts     # RAG 추천
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── kto.ts                     # 관광공사 클라이언트 (AppName 주입)
│   │   ├── hira.ts                    # 심평원 클라이언트
│   │   └── geocode.ts
│   ├── components/
│   │   ├── RegionCard.tsx  ReviewForm.tsx  MapView.tsx  CourseResult.tsx
│   └── types/
├── supabase/
│   ├── migrations/
│   └── functions/                     # Edge Functions (배치 수집)
└── tests/
```

---

## 6. 리스크

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | **운영계정 승인 지연** — 개발 로그·AppName·실서비스 URL 요구, 약 1주 소요 | 10월 심사 시 실데이터 시연 불가 | Phase 0부터 AppName 부착, 9월 초 신청. 승인 전에도 개발계정으로 데모 가능하도록 분리 |
| R2 | **후기 콜드스타트** — 초기 후기 0건이면 F3(RAG)가 성립하지 않음 | 핵심 차별점 붕괴 | 시딩을 Phase 1과 병렬 착수. 에디터 추천 코스로 빈 화면 방어 |
| R3 | **심평원 데이터 지오코딩 실패율** — 주소 기반이라 변환 실패 건 발생 | 지도 마커 누락 | 실패 건 로깅·수기 보정 큐. 지역당 병원 상위 N건만 우선 처리 |
| R4 | **LLM 환각·JSON 스키마 위반** | 추천 신뢰도 붕괴 = 정체성 훼손 | 근거 후기 id를 응답에 강제, 서버에서 id 실존 검증. 위반 시 1회 재시도 후 에디터 코스로 폴백 |
| R5 | **구글 Places 정책 위반** — 실수로 리뷰를 캐싱 | 심사 감점·정책 위반 | `places` 테이블에 리뷰 컬럼 자체를 두지 않음(`google_place_id`만). 스키마로 실수를 봉쇄 |
| R6 | **시딩 후기 출처 누락** | 저작권 문제 | `is_seed = true`일 때 `source` NOT NULL을 DB 제약으로 강제 |
| R7 | 2~3인 팀의 일정 압박 | Phase 지연 | MVP 4개 외 확장 기능은 로드맵 슬라이드로만 제시. 코드로 손대지 않는다 |

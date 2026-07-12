# 05 · 개발 로드맵 & 구조

## 공모 일정 정렬

| 시기 | 단계 | 개발 목표 |
|------|------|-----------|
| 7월 말 | 예비심사·OT | 기획 확정, 시드 DB 착수, 스캐폴딩 |
| 7월 말~9월 | 서비스 개발 | MVP 4기능 + 콜드스타트 시딩 |
| 10월 중 | 1차·최종 심사 | 기능 심사 → PT |
| 11월 중 | 시상식 | — |

---

## 개발 순서 (권장)

### Phase 0 — 셋업 (1주)
- Next.js(App Router) + Supabase + 카카오맵 스캐폴딩
- `.env.local` 키 발급 (관광공사·심평원 개발계정, 카카오, LLM)
- DB 스키마 마이그레이션 (`docs/04-database.md`)
- **모든 API 요청에 앱 식별자 `MobileApp=sarabogo` 주입 유틸 먼저 작성** (`AppName`은 없는 파라미터)

### Phase 1 — 탐색 (지도) (2~3주)
- 관광공사 지역기반/위치기반 API 연동 → `places` 정제 저장 배치
- 심평원 병원/약국 API + 지오코딩 → 지도 마커
- 지역 카드 UI (병원거리·한달실비·후기수·별점 우선 노출)
- 시니어 UX: 큰 버튼 3종(바다/병원/저예산) 진입

### Phase 2 — 후기 (2주)
- `reviews` 구조화 폼 (별점 5항목 + 태그 + 자유서술)
- 콜드스타트 시딩 데이터 입력 (팀 큐레이션 50~80건, 출처 표기)
- 지역별 후기 집계 표시

### Phase 3 — 추천 (RAG) (2주)
- 조건 입력 UI (예산·건강·관심사)
- API Route: DB 후기 쿼리 → LLM 프롬프트 주입 → 주차별 코스 반환
- 근거 후기 함께 노출 (`based_on_review_ids`)
- 에디터 추천 코스 선탑재

### Phase 4 — 공유 & 마감 (1주)
- 카톡 공유 (결과 카드)
- 출처 표기·개인정보처리방침·이용약관
- 운영계정 신청 (개발 로그 확보 후)

---

## 디렉토리 구조 (제안)

```
sarabogo/
├── CLAUDE.md
├── docs/
│   ├── 01-product.md
│   ├── 02-api.md
│   ├── 03-reviews.md
│   ├── 04-database.md
│   └── 05-roadmap.md
├── .env.local
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 랜딩(큰 버튼 3종)
│   │   ├── regions/[id]/page.tsx    # 지역 상세(지도+후기)
│   │   ├── recommend/page.tsx       # 조건 입력→코스
│   │   └── api/
│   │       ├── tour/route.ts        # 관광공사 프록시
│   │       ├── medical/route.ts     # 심평원 프록시
│   │       └── recommend/route.ts   # RAG 추천
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── kto.ts                   # 관광공사 클라이언트(MobileApp 주입)
│   │   ├── hira.ts                  # 심평원 클라이언트
│   │   └── geocode.ts
│   ├── components/
│   │   ├── RegionCard.tsx
│   │   ├── ReviewForm.tsx
│   │   ├── MapView.tsx
│   │   └── CourseResult.tsx
│   └── types/
└── supabase/
    ├── migrations/
    └── functions/                   # Edge Functions (배치 수집)
```

---

## Claude Code 시작 프롬프트 예시

프로젝트 열고 이렇게 시작하면 좋다:

```
CLAUDE.md와 docs/ 전체를 읽고, Phase 0 셋업부터 시작해줘.
먼저 Next.js(App Router) + Supabase + 카카오맵 스캐폴딩을 만들고,
docs/04-database.md의 스키마로 마이그레이션 파일을 생성해줘.
관광공사 API 클라이언트(src/lib/kto.ts)는 모든 요청에 MobileApp='sarabogo'를
자동 주입하도록 먼저 작성해줘.
```

---

## 리스크 체크리스트

- [ ] 관광공사 운영계정 승인 (개발 로그·앱이름(MobileApp)·URL 확보) — 시간 소요, 일찍 준비
- [ ] 시딩 후기 출처 표기 누락 없는지
- [ ] 구글 리뷰 DB 저장 안 했는지 (place_id만)
- [ ] API 키 클라이언트 노출 안 됐는지 (서버 프록시)
- [ ] 관광공사 이미지 출처 표기
- [ ] 경쟁사(한달살러) 후기 기능 10월 재확인

# 살아보고 (SARABOGO)

[English](README.md)

> **"살아본 사람에게 묻고, 나에게 맞게 떠난다."**

검증된 구조화 후기와 한국관광공사 공공데이터로, 은퇴 시니어가 안심하고 지역에서 한 달을 살 수 있도록 돕는 플랫폼입니다. **2026 관광데이터 활용 공모전** (웹·앱 구현 부문) 참가작.

**라이브 데모:** https://sarabogo.vercel.app

<p align="center">
  <img src="assets/brand/kakao-review/screen-feed.png" alt="지역 피드 화면" width="360">
</p>

## 왜 만들었나

지자체마다 한달살기 지원 프로그램에 예산을 쏟지만 정보는 흩어져 있고, 블로그 후기는 광고인지 경험인지 알 수 없습니다. 기존 여행 서비스가 *"무엇을 볼 것인가"* 에 답한다면, 살아보고는 같은 공공데이터에 다른 질문을 던집니다 — *"여기서 한 달 살 수 있는가?"*

그래서 지역 카드는 관광지 사진이 아니라 **생활 지표**를 먼저 보여줍니다:

> 충남 보령시 · 병원 차로 8분 · 한 달 82만원 · 후기 12건 ★4.3

## 주요 기능 (MVP)

| # | 기능 | 내용 |
|---|------|------|
| 1 | **지역 탐색 지도** | 관광공사 TourAPI 데이터를 시니어 지표(병원·약국·비용·평지)로 재편집해 카카오맵에 표시 |
| 2 | **구조화 후기** | 자유서술 대신 항목별 별점 (의료접근성·한달실비·커뮤니티·교통·재방문의사) |
| 3 | **근거 기반 AI 코스** | LLM이 우리 DB의 실제 후기를 근거(RAG)로 주차별 체류 코스를 생성 — 모든 추천에 근거 후기를 함께 표시 |
| 4 | **카톡 공유** | 결과를 자녀·친구에게 한 번에 전송 |

## 설계 원칙

- **정직한 null.** 후기 별점은 nullable입니다. 원문에 교통 언급이 없으면 카드에 **"정보 없음"** 을 그대로 보여줍니다 — 지어낸 별점은 없습니다. 평균은 null 제외로 계산하고, `null`을 `0`으로 치환하지 않습니다. DB CHECK 제약·집계 계층·UI 세 곳에서 강제합니다.
- **크롤링 없음 — 출처가 곧 기능.** 콜드스타트 후기는 **공공누리 제1유형 공공저작물**(저작권법 제24조의2, 출처표시만으로 자유이용)과 개별 이용허락 저작물에서만 확보합니다. 모든 시딩 후기에 출처 배지가 붙습니다. 관리자 콘솔은 *정책 게이트*로 설계되어, 사실 추출(curated) 폼에는 원문 붙여넣기 필드 자체가 없습니다.
- **포트+어댑터.** DB(`DbPort`)·LLM(`LlmPort`)·지오코딩(`GeocodePort`)을 벤더로부터 격리했습니다. 동일한 계약 테스트가 인메모리 페이크와 실제 Supabase 양쪽에서 통과합니다 — 교체 가능성이 주장이 아니라 증명입니다. ESLint가 `adapters/` 밖의 벤더 SDK import를 차단합니다.
- **시니어 안전 피드.** 인스타그램식 카드 피드에서 안티패턴만 제거: 무한 스크롤 금지(10개 + "더 보기" 버튼), 아이콘+한글 레이블 탭, 본문 18px 이상, 단일 토큰 파일에서 WCAG AA 대비 강제.

## 기술 스택

| 레이어 | 선택 |
|--------|------|
| 프론트 + API | Next.js (App Router), Tailwind v4, PWA |
| DB / 인증 / RLS | Supabase (PostgreSQL) — `DbPort` 어댑터 경유 |
| AI | Claude API (기본) / OpenAI — `LLM_PROVIDER`로 교체 |
| 지도 | 카카오맵 JS SDK + 카카오 로컬 지오코딩 |
| 데이터 | 관광공사 TourAPI 4.0 · 심평원 병원/약국 API |
| 배포 | Vercel |

## 시작하기

```bash
git clone https://github.com/daehyub71/sarabogo.git
cd sarabogo
npm install
cp .env.example .env   # API 키 입력
npm run dev            # http://localhost:3000
```

전체 검증:

```bash
npm run validate                 # lint + 타입체크 + 테스트
node scripts/check-keys.mjs      # 외부 API 키 전체 실호출 점검
```

Supabase 프로젝트에 스키마 적용:

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_rls.sql
```

## 프로젝트 구조

```
src/
├── app/                  # Next.js App Router 페이지 + API 라우트
├── components/           # RegionCard, FeedList, ui/ 원시 컴포넌트
├── lib/
│   ├── kto.ts            # 관광공사 클라이언트 (MobileApp 식별자 자동 주입)
│   ├── hira.ts           # 심평원 병원·약국 클라이언트 (XML, 좌표 포함)
│   ├── db/               # DbPort + adapters/ (supabase, memory)
│   ├── llm/              # LlmPort + adapters/ (anthropic, openai)
│   ├── geocode/          # GeocodePort + adapters/ (kakao, table 폴백)
│   ├── authz.ts          # 앱 레이어 인가 (1차 경계 · RLS는 2차)
│   └── reviews*.ts       # 후기 쓰기 서비스 + null 안전 집계
├── styles/tokens.css     # 디자인 토큰 단일 출처 (시니어 접근성)
supabase/migrations/      # 스키마 + RLS (후기 origin별 CHECK 제약)
tests/                    # vitest — DbPort 계약을 어댑터 2종에서 실행
scripts/                  # check-keys, shot (스크린샷 + 오버플로 점검)
```

## 데이터 컴플라이언스

- 관광공사 TourAPI 호출은 전부 `lib/kto.ts`를 경유하며 앱 식별자(`MobileApp=sarabogo`)를 자동 주입합니다. 참고: TourAPI에 **`AppName` 파라미터는 존재하지 않으며** 보내면 모든 요청이 실패합니다 (실호출 검증).
- 구글 Places 데이터는 저장하지 않습니다 (정책상 `place_id`만 허용). 봇이든 사람 손이든 플랫폼 스크래핑은 하지 않습니다.
- 시딩 후기: 공공누리 제1유형 저작물만 사용하며, 출처표시 필드를 DB 제약으로 강제합니다.

## 라이선스

공모전 참가작 — 라이선스 미정. 관광 데이터 © 한국관광공사 (공공누리).

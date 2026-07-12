/*
 * 서비스워커 — PWA 설치 가능 요건 충족용 최소 구현.
 * Phase 0에서는 오프라인 캐싱을 적극적으로 하지 않는다(데이터 신선도 우선).
 * 캐시 전략은 Phase 4에서 앱 셸 프리캐시로 확장한다.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 네트워크 우선 — 화면은 항상 최신 DB 데이터를 본다.
self.addEventListener("fetch", () => {
  // 통과(no-op). 향후 앱 셸 정적 자원만 선택적으로 캐싱한다.
});

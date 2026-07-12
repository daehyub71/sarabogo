#!/usr/bin/env node
/**
 * 앱 화면 스크린샷 도구 (심사 제출·블로그·검증용).
 *
 * 모바일 에뮬레이션 + 라이트모드 강제로 실제 사용자 화면을 찍는다.
 * 가로 오버플로(시니어 UX 치명적)도 함께 측정해 리포트한다.
 *
 * 사전: npm run build && npm run start (별도 터미널)
 * 실행: node scripts/shot.mjs [경로] [출력파일]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const path = process.argv[2] ?? "/";
const out = process.argv[3] ?? "/tmp/shot/app.png";
const WIDTH = 390; // iPhone 14 기준
const HEIGHT = 844;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars"],
});

const page = await browser.newPage();
await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, isMobile: true });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
// networkidle0은 Next의 상시 연결 때문에 타임아웃난다. load + 짧은 정착 대기로 충분.
await page.goto(`http://localhost:3000${path}`, { waitUntil: "load", timeout: 20_000 });
await new Promise((r) => setTimeout(r, 700));

// 가로 오버플로 진단 — 시니어 UX에서 가로 스크롤은 치명적이다.
const diag = await page.evaluate(() => {
  const de = document.documentElement;
  const offenders = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.right > de.clientWidth + 1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className?.toString?.() ?? "").slice(0, 60),
        right: Math.round(r.right),
        width: Math.round(r.width),
      });
    }
  }
  return {
    viewport: de.clientWidth,
    scrollWidth: de.scrollWidth,
    overflow: de.scrollWidth > de.clientWidth,
    offenders: offenders.slice(0, 6),
  };
});

console.log(`뷰포트: ${diag.viewport}px · 문서 폭: ${diag.scrollWidth}px`);
if (diag.overflow) {
  console.log("❌ 가로 오버플로 발생 — 원인 요소:");
  for (const o of diag.offenders) {
    console.log(`   <${o.tag} class="${o.cls}"> width=${o.width} right=${o.right}`);
  }
} else {
  console.log("✅ 가로 오버플로 없음");
}

await page.screenshot({ path: out, fullPage: false });
console.log(`저장: ${out}`);

await browser.close();
process.exit(diag.overflow ? 1 : 0);

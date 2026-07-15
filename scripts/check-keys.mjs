#!/usr/bin/env node
/**
 * 전체 외부 API 키 활성화 점검 (실호출).
 *
 * 문서·mock을 믿지 않고 실제로 때려본다 — 관광공사에서 문서 규칙(AppName)이
 * 실제와 달라 모든 호출이 실패할 뻔했다.
 *
 * 실행: set -a && . ./.env && set +a && node scripts/check-keys.mjs
 */
const results = [];
function ok(name, detail) { results.push({ name, state: "✅", detail }); }
function bad(name, detail) { results.push({ name, state: "❌", detail }); }

// ── 관광공사 TourAPI ──────────────────────────
async function checkTour() {
  const key = process.env.TOUR_API_KEY;
  if (!key) return bad("관광공사 TourAPI", "TOUR_API_KEY 미설정");
  const p = new URLSearchParams({
    serviceKey: key, MobileOS: "ETC", MobileApp: "sarabogo",
    _type: "json", numOfRows: "1", pageNo: "1",
  });
  try {
    const r = await fetch(`https://apis.data.go.kr/B551011/KorService2/areaCode2?${p}`);
    const j = await r.json();
    const code = j?.response?.header?.resultCode ?? j?.resultCode;
    if (code === "0000") ok("관광공사 TourAPI", "resultCode 0000 · areaCode2 정상");
    else bad("관광공사 TourAPI", `resultCode ${code}: ${j?.response?.header?.resultMsg ?? j?.resultMsg ?? ""}`);
  } catch (e) { bad("관광공사 TourAPI", e.message); }
}

// ── 심평원 (병원·약국) ────────────────────────
async function checkHira() {
  const key = process.env.HIRA_API_KEY;
  if (!key) return bad("심평원", "HIRA_API_KEY 미설정");
  const targets = [
    ["병원", "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"],
    ["약국", "https://apis.data.go.kr/B551182/pharmacyInfoService/getParmacyBasisList"],
  ];
  for (const [label, base] of targets) {
    const p = new URLSearchParams({ serviceKey: key, pageNo: "1", numOfRows: "1" });
    try {
      const r = await fetch(`${base}?${p}`);
      const t = await r.text();
      const code = t.match(/<resultCode>(\d+)<\/resultCode>/)?.[1];
      if (r.status === 200 && (code === "00" || code === "0000")) ok(`심평원 ${label}`, "resultCode 00 NORMAL");
      else if (r.status === 403) bad(`심평원 ${label}`, "403 — 활용신청 승인/전파 대기");
      else bad(`심평원 ${label}`, `HTTP ${r.status} · resultCode ${code ?? "?"}`);
    } catch (e) { bad(`심평원 ${label}`, e.message); }
  }
}

// ── 카카오 REST (로컬/지오코딩) ───────────────
async function checkKakao() {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return bad("카카오 로컬(REST)", "KAKAO_REST_API_KEY 미설정");
  try {
    const r = await fetch(
      "https://dapi.kakao.com/v2/local/search/address.json?query=" + encodeURIComponent("충남 보령시 대해로 604"),
      { headers: { Authorization: `KakaoAK ${key}` } },
    );
    const j = await r.json();
    if (r.ok && j.documents?.length) {
      const d = j.documents[0];
      ok("카카오 로컬(REST)", `지오코딩 정상 · (${d.y}, ${d.x})`);
    } else if (j?.message?.includes("disabled")) {
      bad("카카오 로컬(REST)", "OPEN_MAP_AND_LOCAL 비활성 — 카카오맵 활성화/심사 대기");
    } else {
      bad("카카오 로컬(REST)", `HTTP ${r.status}: ${j?.message ?? JSON.stringify(j).slice(0, 120)}`);
    }
  } catch (e) { bad("카카오 로컬(REST)", e.message); }
}

// JS 키는 브라우저 SDK 전용이라 서버에서 검증 불가 — 존재만 확인.
function checkKakaoJs() {
  const key = process.env.KAKAO_JS_KEY;
  if (!key) return bad("카카오 JS 키", "KAKAO_JS_KEY 미설정");
  ok("카카오 JS 키", `설정됨(len=${key.length}) · 실검증은 브라우저 지도 로드 시`);
}

// ── LLM (Anthropic · 기본 공급자) ─────────────
async function checkAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return bad("Anthropic (Claude)", "ANTHROPIC_API_KEY 미설정");
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 16,
      messages: [{ role: "user", content: "OK라고만 답해" }],
    });
    const text = msg.content.find((b) => b.type === "text")?.text ?? "";
    ok("Anthropic (Claude)", `응답 수신: "${text.slice(0, 20)}" · model=${msg.model}`);
  } catch (e) {
    bad("Anthropic (Claude)", `${e.status ?? ""} ${e.message}`.trim().slice(0, 90));
  }
}

// ── LLM (OpenAI · 대체 어댑터) ────────────────
async function checkOpenAi() {
  if (!process.env.OPENAI_API_KEY) return bad("OpenAI (GPT)", "OPENAI_API_KEY 미설정");
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI();
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 16,
      messages: [{ role: "user", content: "OK라고만 답해" }],
    });
    const text = res.choices[0]?.message?.content ?? "";
    ok("OpenAI (GPT)", `응답 수신: "${text.slice(0, 20)}" · model=${res.model}`);
  } catch (e) {
    bad("OpenAI (GPT)", `${e.status ?? ""} ${e.message}`.trim().slice(0, 90));
  }
}

await checkTour();
await checkHira();
await checkKakao();
checkKakaoJs();
await checkAnthropic();
await checkOpenAi();

console.log("\n외부 API 키 점검 (실호출)\n" + "─".repeat(52));
for (const r of results) {
  console.log(`${r.state} ${r.name.padEnd(18)} ${r.detail}`);
}
const failed = results.filter((r) => r.state === "❌");
console.log("─".repeat(52));
console.log(failed.length === 0 ? "전부 활성." : `${failed.length}건 대기/문제.`);

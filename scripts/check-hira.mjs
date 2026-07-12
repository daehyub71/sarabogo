#!/usr/bin/env node
/**
 * 심평원 키 활성화 확인 스크립트.
 *
 * 활용신청 승인 후 키가 게이트웨이에 전파되기까지 시간이 걸린다(관광공사도 그랬다).
 * 403이면 아직 전파 전이므로 잠시 후 다시 실행한다.
 *
 * 실행: set -a && . ./.env && set +a && node scripts/check-hira.mjs
 */
const key = process.env.HIRA_API_KEY;
if (!key) {
  console.error("HIRA_API_KEY가 없다. .env를 확인하라.");
  process.exit(1);
}

// 2026-07-12 실호출로 경로 검증됨 (키 없이 401 → 경로 정상).
const ENDPOINTS = [
  ["병원정보", "https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList"],
  ["약국정보", "https://apis.data.go.kr/B551182/pharmacyInfoService/getParmacyBasisList"],
];

const VERDICT = {
  403: "❌ 아직 전파 전 (활용신청 승인 확인 후 잠시 뒤 재시도)",
  401: "❌ 키가 전달되지 않음",
  500: "❌ 경로 오류",
};

let allOk = true;

for (const [name, base] of ENDPOINTS) {
  const params = new URLSearchParams({
    serviceKey: key, // URLSearchParams가 인코딩한다 → Decoding 키를 넣을 것
    pageNo: "1",
    numOfRows: "1",
  });

  try {
    const res = await fetch(`${base}?${params}`);
    const text = await res.text();

    if (res.status === 200) {
      // 심평원은 XML이 기본. resultCode를 뽑아본다.
      const code = text.match(/<resultCode>(\d+)<\/resultCode>/)?.[1];
      const msg = text.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1] ?? "";
      const ok = code === "00" || code === "0000";
      console.log(`${ok ? "✅" : "⚠️ "} ${name}: HTTP 200 · resultCode=${code ?? "?"} ${msg}`);
      if (!ok) {
        allOk = false;
        console.log(`   본문: ${text.slice(0, 160).replace(/\s+/g, " ")}`);
      }
    } else {
      allOk = false;
      console.log(`${VERDICT[res.status] ?? "❌"} ${name}: HTTP ${res.status}`);
    }
  } catch (err) {
    allOk = false;
    console.log(`❌ ${name}: 요청 실패 — ${err.message}`);
  }
}

console.log(
  allOk
    ? "\n심평원 키 활성화 완료. lib/hira.ts 작성 가능."
    : "\n아직 준비 안 됨. 마이페이지에서 3종 활용신청이 모두 '승인'인지 확인하고 잠시 후 재시도.",
);
process.exit(allOk ? 0 : 1);

#!/usr/bin/env tsx
/**
 * 관리자 계정 생성/승격 (1회성).
 * Supabase Auth에 이메일+비밀번호 사용자를 만들고 profiles.role='admin'으로 설정한다.
 *
 * 실행: set -a && . ./.env && set +a && \
 *       ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npx tsx scripts/create-admin.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!url || !svc || !email || !password) {
  console.error("환경변수 누락: SUPABASE_URL / SERVICE_ROLE_KEY / ADMIN_EMAIL / ADMIN_PASSWORD");
  process.exit(1);
}

const admin = createClient(url, svc, { auth: { persistSession: false } });

async function main() {
  // 이미 있으면 재사용, 없으면 생성 (이메일 확인 생략 = 즉시 로그인 가능).
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId = created.data.user?.id;
  if (created.error) {
    if (!/already/i.test(created.error.message)) throw created.error;
    // 이미 존재 → 목록에서 찾는다.
    const list = await admin.auth.admin.listUsers();
    userId = list.data.users.find((u) => u.email === email)?.id;
    if (userId) {
      await admin.auth.admin.updateUserById(userId, { password }); // 비밀번호 재설정
    }
  }
  if (!userId) throw new Error("사용자 id를 확인할 수 없다");

  // profiles upsert + role=admin.
  const { error } = await admin
    .from("profiles")
    .upsert({ id: userId, role: "admin", nickname: "관리자" }, { onConflict: "id" });
  if (error) throw error;

  console.log(`✅ 관리자 준비 완료: ${email} (role=admin)`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});

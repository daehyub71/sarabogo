/**
 * 서버 컴포넌트/액션용 인증 헬퍼.
 * 로그인 사용자와 role을 읽어 authz(Actor)로 넘긴다. RLS는 심층 방어, authz가 1차 경계.
 */
import { cookies } from "next/headers";
import { serverAuthClient } from "@/lib/auth/adapters/clients";
import type { Actor } from "@/lib/authz";

/**
 * next/headers cookies() → 읽기 전용 CookieStore.
 * ⚠️ setAll을 no-op으로 둔다. 서버컴포넌트/액션이 토큰을 회전시키면 후속 요청의
 *    쿠키가 무효화되는 경합이 생긴다(@supabase/ssr 정석: 갱신은 미들웨어만).
 */
async function cookieStore() {
  const jar = await cookies();
  return {
    getAll: () => jar.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: () => {
      /* no-op — 세션 갱신은 미들웨어가 담당 */
    },
  };
}

/** 현재 로그인 사용자의 Actor를 반환한다. 미로그인이면 role='anon'. */
export async function getActor(): Promise<Actor> {
  const supabase = serverAuthClient(await cookieStore());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { id: null, role: "anon" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role === "admin" ? "admin" : "user";
  return { id: user.id, role };
}

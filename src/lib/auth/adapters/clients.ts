/**
 * Supabase Auth 클라이언트 팩토리 (@supabase/ssr).
 *
 * 벤더 SDK import는 adapters/ 안에서만 허용된다 (CLAUDE.md C-5).
 * 바깥(미들웨어·서버컴포넌트·서버액션)은 이 모듈의 팩토리만 쓰고, 쿠키 접근 방식만 주입한다.
 */
import { createBrowserClient, createServerClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** 브라우저(클라이언트 컴포넌트)용. */
export function browserAuthClient() {
  return createBrowserClient(URL, ANON);
}

/** 쿠키 저장소 어댑터 — 환경별(미들웨어/RSC/액션)로 구현을 주입한다. */
export interface CookieStore {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void;
}

/** 서버(미들웨어·서버컴포넌트·서버액션)용. 쿠키 접근을 주입받는다. */
export function serverAuthClient(store: CookieStore) {
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookies) => store.setAll(cookies),
    },
  });
}

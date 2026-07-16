import { NextResponse, type NextRequest } from "next/server";
import { serverAuthClient } from "@/lib/auth/adapters/clients";

/**
 * 세션 토큰 갱신 미들웨어. /admin 하위에서만 동작하면 충분하다.
 * @supabase/ssr 표준 패턴: 요청 쿠키를 읽고 갱신된 쿠키를 응답에 실어준다.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = serverAuthClient({
    getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (cookies) => {
      for (const c of cookies) request.cookies.set(c.name, c.value);
      response = NextResponse.next({ request });
      for (const c of cookies) response.cookies.set(c.name, c.value, c.options);
    },
  });

  // 세션 갱신 트리거.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};

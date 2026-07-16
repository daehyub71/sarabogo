"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverAuthClient } from "@/lib/auth/adapters/clients";

/** 이메일+비밀번호 로그인. 성공 시 /admin으로. */
export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const jar = await cookies();
  const supabase = serverAuthClient({
    getAll: () => jar.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (list) => {
      for (const c of list) jar.set(c.name, c.value, c.options);
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent("로그인 실패: 이메일/비밀번호를 확인하세요")}`);
  }
  redirect("/admin");
}

export async function logoutAction() {
  const jar = await cookies();
  const supabase = serverAuthClient({
    getAll: () => jar.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (list) => {
      for (const c of list) jar.set(c.name, c.value, c.options);
    },
  });
  await supabase.auth.signOut();
  redirect("/login");
}

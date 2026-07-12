/**
 * DbPort 팩토리 — 바깥 코드가 어댑터를 직접 알지 못하게 하는 유일한 진입점.
 *
 * 화면·API는 `import { getDb } from "@/lib/db"` 로만 DB에 접근한다.
 * 어댑터 교체는 여기 한 곳만 바꾸면 된다.
 */
import type { DbPort } from "@/lib/db/port";
import { createSupabaseDbFromEnv } from "@/lib/db/adapters/supabase";

let instance: DbPort | null = null;

/** 기본 DbPort(Supabase)를 반환한다. 서버에서만 호출한다. */
export function getDb(): DbPort {
  if (!instance) {
    instance = createSupabaseDbFromEnv();
  }
  return instance;
}

/** 테스트에서 어댑터를 주입하기 위한 훅. */
export function setDb(db: DbPort): void {
  instance = db;
}

export type { DbPort } from "@/lib/db/port";

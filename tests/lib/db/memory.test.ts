import { createMemoryDb } from "@/lib/db/adapters/memory";
import { runDbContract } from "./contract";

// 인메모리 어댑터로 DbPort 계약을 검증한다.
// Supabase 어댑터도 같은 계약(runDbContract)을 통과해야 한다 — supabase.integration.test.ts 참조.
runDbContract("memory", (seed) => createMemoryDb(seed));

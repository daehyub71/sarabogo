"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createReview } from "@/lib/reviews";
import { assertAdmin } from "@/lib/authz";
import type { NewReview, ReviewOrigin } from "@/types/domain";

/** '' → null, 아니면 정수. */
function intOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function strOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/**
 * 후기 시딩 입력 — 정책 게이트.
 * origin에 따라 필수/금지 필드가 갈린다. DB CHECK 제약이 최종 방어선.
 * 관리자가 원문 대조 후 입력하므로 입력=검수(verified_at=now). 다단계 큐는 이후.
 */
export async function submitReviewAction(formData: FormData) {
  const actor = await getActor();
  assertAdmin(actor); // 1차 경계

  const origin = String(formData.get("origin") ?? "") as ReviewOrigin;
  const regionId = String(formData.get("regionId") ?? "");
  if (!regionId) redirect("/admin/reviews/new?error=지역을 선택하세요");

  const now = new Date().toISOString();
  const stars = {
    medicalAccess: intOrNull(formData.get("medicalAccess")),
    loneliness: intOrNull(formData.get("loneliness")),
    transport: intOrNull(formData.get("transport")),
    revisit: intOrNull(formData.get("revisit")),
  };
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // origin 공통 골격.
  const base: NewReview = {
    regionId,
    origin,
    authorId: null, // 시딩 후기는 작성자 없음
    ...stars,
    monthlyCost: intOrNull(formData.get("monthlyCost")),
    summary: strOrNull(formData.get("summary")),
    tags,
    sourceOrg: null,
    sourceYear: null,
    sourceTitle: null,
    sourceUrl: null,
    sourceDomain: null,
    sourceLicense: null,
    consentDocUrl: null,
    extractedBy: "human",
    verifiedBy: actor.id,
    verifiedAt: now,
  };

  let input: NewReview;
  switch (origin) {
    case "public_doc":
      input = {
        ...base,
        sourceOrg: strOrNull(formData.get("sourceOrg")),
        sourceYear: intOrNull(formData.get("sourceYear")),
        sourceTitle: strOrNull(formData.get("sourceTitle")),
        sourceUrl: strOrNull(formData.get("sourceUrl")),
        sourceLicense: "KOGL-1", // 제1유형만 (폼에서 고정)
      };
      break;
    case "licensed":
      input = {
        ...base,
        sourceUrl: strOrNull(formData.get("sourceUrl")),
        sourceLicense: "CONSENT",
        consentDocUrl: strOrNull(formData.get("consentDocUrl")),
      };
      break;
    case "curated":
      // ⚠️ 원문 저장 금지. summary는 관리자가 직접 쓴 사실 요약(400자 상한 — DB CHECK).
      input = {
        ...base,
        sourceUrl: strOrNull(formData.get("sourceUrl")),
        sourceDomain: strOrNull(formData.get("sourceDomain")),
        sourceLicense: null, // 원문 저장 근거 없음 → 비움
      };
      break;
    case "interview":
      input = { ...base };
      break;
    default:
      redirect("/admin/reviews/new?error=허용되지 않은 origin");
  }

  const db = getDb();
  try {
    const created = await createReview(db, actor, input!);
    await db.recordAdminAudit({
      actorId: actor.id!,
      action: "review.create",
      targetTable: "reviews",
      targetId: created.id,
      payload: {
        origin,
        sourceUrl: input!.sourceUrl,
        sourceLicense: input!.sourceLicense,
      },
    });
  } catch (e) {
    // DB CHECK 위반 등 → 사유를 폼에 되돌린다.
    const msg = e instanceof Error ? e.message : "저장 실패";
    redirect(`/admin/reviews/new?error=${encodeURIComponent(msg.slice(0, 120))}`);
  }

  redirect("/admin/reviews/new?ok=1");
}

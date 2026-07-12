"use client";

import { useEffect } from "react";

/** 서비스워커를 등록한다 (PWA 설치 가능 요건). 프로덕션에서만 활성. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 등록 실패는 치명적이지 않다(설치형 경험만 비활성).
      });
    }
  }, []);

  return null;
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind 클래스 병합 유틸 — 충돌 클래스를 뒤 값으로 정리한다. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind 클래스 안전 병합 유틸 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 숫자를 한국식 단위로 압축 (1234 → 1.2K) */
export function compactNumber(value: number): string {
  if (value < 1000) return value.toLocaleString("ko-KR");
  if (value < 10000) return `${(value / 1000).toFixed(1)}K`;
  if (value < 100000000) return `${Math.round(value / 1000).toLocaleString("ko-KR")}K`;
  return `${(value / 100000000).toFixed(1)}억`;
}

/** 원 → "X만원" */
export function formatTuition(won: number | null | undefined): string {
  if (!won) return "-";
  return `${Math.round(won / 10000).toLocaleString("ko-KR")}만`;
}

/** 거리 표시 */
export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

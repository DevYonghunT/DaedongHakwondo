import type { RiskType, ResourceType } from "@/lib/types";

export const WALKING_30_MIN_RADIUS_KM = 2.5;
export const WALKING_30_MIN_LABEL = "걸어서 30분";

export const RISK_LABELS: Record<RiskType, string> = {
  PRIVATE_EDUCATION_DESERT: "배움터 빈자리",
  HIGH_COST_HOTSPOT: "학원비 주의",
  CHOICE_RICH: "선택지 넉넉",
  PUBLIC_SUPPORT_PRIORITY: "무료 배움터 필요",
  BALANCED_WATCH: "차분히 지켜보기"
};

export const RISK_DESCRIPTIONS: Record<RiskType, string> = {
  PRIVATE_EDUCATION_DESERT:
    "가까운 학원도, 무료로 갈 곳도 적어요.",
  HIGH_COST_HOTSPOT:
    "학원은 많지만 비용을 꼭 살펴봐야 해요.",
  CHOICE_RICH:
    "고를 곳이 넉넉해 차분히 비교하기 좋아요.",
  PUBLIC_SUPPORT_PRIORITY:
    "학원은 보여요. 무료로 갈 곳은 더 필요해요.",
  BALANCED_WATCH:
    "큰 걱정은 적어요. 변화만 살펴보면 돼요."
};

export const RISK_COLORS: Record<RiskType, string> = {
  PRIVATE_EDUCATION_DESERT: "#f43f5e",
  HIGH_COST_HOTSPOT: "#f59e0b",
  CHOICE_RICH: "#10b981",
  PUBLIC_SUPPORT_PRIORITY: "#0ea5e9",
  BALANCED_WATCH: "#64748b"
};

export const RISK_BADGE_CLASSES: Record<RiskType, string> = {
  PRIVATE_EDUCATION_DESERT: "border-rose-200 bg-rose-50 text-rose-700",
  HIGH_COST_HOTSPOT: "border-amber-200 bg-amber-50 text-amber-700",
  CHOICE_RICH: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PUBLIC_SUPPORT_PRIORITY: "border-sky-200 bg-sky-50 text-sky-700",
  BALANCED_WATCH: "border-slate-200 bg-slate-50 text-slate-600"
};

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  LIBRARY: "도서관",
  YOUTH_CENTER: "청소년센터",
  PUBLIC_PROGRAM: "무료 프로그램",
  COUNSELING_CENTER: "상담복지센터"
};

export const REALM_GROUPS: Record<string, string> = {
  "입시.검정 및 보습": "학습/입시",
  보습: "학습/입시",
  수학: "학습/입시",
  영어: "외국어",
  외국어: "외국어",
  국제화: "외국어",
  예능: "예체능",
  "예능(대)": "예체능",
  음악: "예체능",
  미술: "예체능",
  정보: "코딩/IT",
  직업기술: "직업/자격",
  독서실: "독서실",
  기타: "기타"
};

export const EDUCATION_OFFICE_CODES = [
  "B10",
  "C10",
  "D10",
  "E10",
  "F10",
  "G10",
  "H10",
  "I10",
  "J10",
  "K10",
  "M10",
  "N10",
  "P10",
  "Q10",
  "R10",
  "S10",
  "T10"
];

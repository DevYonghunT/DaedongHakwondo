import { z } from "zod";
import { RISK_LABELS, WALKING_30_MIN_RADIUS_KM } from "@/lib/constants";
import { buildAreaScores, buildSchoolReport } from "@/lib/scoring";

export const AiReportRequest = z.object({
  reportType: z.enum(["PARENT_ONE_PAGE", "PRINCIPAL_PROPOSAL", "DISTRICT_MEMO"]),
  schoolId: z.string().optional(),
  regionKey: z.string().optional()
});

export const AiReportResponse = z.object({
  title: z.string(),
  summary: z.string(),
  evidenceBullets: z.array(z.string()),
  actions: z.array(z.string()),
  dataLimits: z.array(z.string()),
  generatedBy: z.enum(["deterministic-public-data-engine", "external-ai-provider"])
});

export type AiReportRequest = z.infer<typeof AiReportRequest>;
export type AiReportResponse = z.infer<typeof AiReportResponse>;

const cache = new Map<string, { expiresAt: number; payload: AiReportResponse }>();
const rateLimit = new Map<string, { resetAt: number; count: number }>();

export function checkRateLimit(key: string, limit = 6, windowMs = 60_000) {
  const now = Date.now();
  const current = rateLimit.get(key);

  if (!current || current.resetAt < now) {
    rateLimit.set(key, { resetAt: now + windowMs, count: 1 });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

export function buildAiReport(input: AiReportRequest): AiReportResponse | null {
  const cacheKey = JSON.stringify(input);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const report = input.schoolId
    ? buildSchoolReport(input.schoolId, WALKING_30_MIN_RADIUS_KM)
    : null;
  const area = input.regionKey
    ? buildAreaScores().find((entry) => entry.areaKey === input.regionKey)
    : null;

  if (!report && !area) {
    return null;
  }

  const targetName = report?.school.name ?? area?.label ?? "선택한 동네";
  const risk = report?.risk ?? area?.risk ?? "BALANCED_WATCH";
  const evidence = report?.evidence ?? area?.evidence;

  if (!evidence) {
    return null;
  }

  const commonLimits = [
    "데이터에는 학원 성과, 합격률, 후기가 없어요.",
    "학원비 비공개 항목은 조심해서 표시했어요.",
    "실제로 쓰기 전 최신 데이터와 현장을 확인해요."
  ];

  const payload: AiReportResponse = {
    title:
      input.reportType === "PARENT_ONE_PAGE"
        ? `${targetName} 우리 아이 배움 플랜`
        : input.reportType === "PRINCIPAL_PROPOSAL"
          ? `${targetName} 학교장 방과후 제안`
          : `${targetName} 지역 배움 메모`,
    summary: `${targetName}은 ${RISK_LABELS[risk]} 상태예요. 등록 학원 ${evidence.registeredAcademyCount}곳, 무료 배움터 ${evidence.publicResourceCount}곳, 평균 공개 학원비 ${
      evidence.averageMonthlyFee
        ? `${Math.round(evidence.averageMonthlyFee / 10000)}만원`
        : "비공개"
    }로 살펴봤어요.`,
    evidenceBullets: [
      `등록 학원 ${evidence.registeredAcademyCount}곳, 휴·폐원 ${evidence.closedAcademyCount}곳`,
      `과목 선택폭 ${evidence.realmCount}개 그룹, 학원비 공개율 ${evidence.disclosedFeeRate}%`,
      `대중교통 정류장 ${evidence.transitStopCount}곳, 보호구역 데이터 ${evidence.safetyZoneCount}건`
    ],
    actions:
      input.reportType === "PARENT_ONE_PAGE"
        ? [
            "무료 배움터를 먼저 보고 부족한 과목만 학원으로 보완해요.",
            "예산을 넘는 학원은 교재비와 회차를 따로 확인해요.",
            "저녁 이동이 있으면 정류장과 보호구역을 확인해요."
          ]
        : input.reportType === "PRINCIPAL_PROPOSAL"
          ? [
              "수요가 높은 수학 과목부터 작은 방과후반을 열어요.",
              "도서관·청소년센터와 무료 좌석을 함께 마련해요.",
              "학기마다 학원비와 폐원 변화를 살펴요."
            ]
          : [
              "무료 배움터 필요 지역에 찾아가는 학습클리닉을 배치해요.",
              "학원비 주의 지역에는 무료 멘토링을 먼저 붙여요.",
              "배움터 빈자리 지역은 학교 공간을 함께 살펴요."
            ],
    dataLimits: commonLimits,
    generatedBy: "deterministic-public-data-engine"
  };

  const parsed = AiReportResponse.parse(payload);
  cache.set(cacheKey, { expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, payload: parsed });
  return parsed;
}

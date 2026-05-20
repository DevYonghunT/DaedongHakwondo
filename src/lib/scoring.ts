import {
  academies,
  learningResources,
  safetyZones,
  schoolDirectory,
  schools,
  transitStops
} from "@/lib/public-data";
import { getAcademyCandidates } from "@/lib/academy-universe";
import { WALKING_30_MIN_LABEL, WALKING_30_MIN_RADIUS_KM } from "@/lib/constants";
import type {
  Academy,
  AreaScore,
  Evidence,
  LatLng,
  LearningResource,
  RiskType,
  SafetyMetrics,
  School,
  SchoolSafetyNetReport
} from "@/lib/types";

const EARTH_RADIUS_KM = 6371;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function withinRadius<T extends { coordinate: LatLng }>(
  items: T[],
  center: LatLng,
  radiusKm: number
) {
  return items
    .map((item) => ({ item, distance: distanceKm(center, item.coordinate) }))
    .filter((entry) => entry.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildEvidence(
  nearbyAcademies: Academy[],
  nearbyResources: LearningResource[],
  transitStopCount: number,
  safetyZoneCount: number
): Evidence {
  const feeValues = nearbyAcademies
    .filter((academy) => academy.monthlyFee != null)
    .map((academy) => academy.monthlyFee as number);
  const registeredAcademyCount = nearbyAcademies.filter(
    (academy) => academy.status === "등록"
  ).length;
  const closedAcademyCount = nearbyAcademies.filter(
    (academy) => academy.status === "폐원" || academy.status === "휴원"
  ).length;
  const realmCount = new Set(nearbyAcademies.map((academy) => academy.group)).size;

  return {
    academyCount: nearbyAcademies.length,
    registeredAcademyCount,
    closedAcademyCount,
    averageMonthlyFee: average(feeValues),
    disclosedFeeRate:
      nearbyAcademies.length === 0
        ? 0
        : Math.round(
            (nearbyAcademies.filter((academy) => academy.feeDisclosed).length /
              nearbyAcademies.length) *
              100
          ),
    realmCount,
    publicResourceCount: nearbyResources.length,
    transitStopCount,
    safetyZoneCount
  };
}

export function computeMetrics(evidence: Evidence): SafetyMetrics {
  const accessibility = clamp((evidence.registeredAcademyCount / 10) * 100);
  const fee = evidence.averageMonthlyFee ?? 520000;
  const tuitionRelief = clamp(100 - ((fee - 150000) / 450000) * 100);
  const diversity = clamp((evidence.realmCount / 6) * 100);
  const stability = clamp(
    evidence.academyCount === 0
      ? 55
      : 100 - (evidence.closedAcademyCount / evidence.academyCount) * 75
  );
  const transit = clamp((evidence.transitStopCount / 3) * 100);
  const commuteSafety = clamp(48 + evidence.safetyZoneCount * 26);
  const publicResource = clamp((evidence.publicResourceCount / 3) * 100);

  return {
    accessibility: Math.round(accessibility),
    tuitionRelief: Math.round(tuitionRelief),
    diversity: Math.round(diversity),
    stability: Math.round(stability),
    transit: Math.round(transit),
    commuteSafety: Math.round(commuteSafety),
    publicResource: Math.round(publicResource)
  };
}

export function computeSafetyNetScore(metrics: SafetyMetrics) {
  const weighted =
    metrics.accessibility * 0.22 +
    metrics.tuitionRelief * 0.2 +
    metrics.diversity * 0.14 +
    metrics.stability * 0.12 +
    metrics.transit * 0.1 +
    metrics.commuteSafety * 0.1 +
    metrics.publicResource * 0.12;

  return Math.round(clamp(weighted));
}

export function classifyRisk(
  score: number,
  evidence: Evidence,
  metrics: SafetyMetrics
): RiskType {
  if (evidence.registeredAcademyCount <= 2 && evidence.publicResourceCount <= 1) {
    return "PRIVATE_EDUCATION_DESERT";
  }

  if (
    evidence.averageMonthlyFee != null &&
    evidence.averageMonthlyFee >= 400000 &&
    evidence.registeredAcademyCount >= 5
  ) {
    return "HIGH_COST_HOTSPOT";
  }

  if (score >= 74 && metrics.diversity >= 65 && evidence.publicResourceCount >= 2) {
    return "CHOICE_RICH";
  }

  if (metrics.publicResource < 50 || metrics.accessibility < 45) {
    return "PUBLIC_SUPPORT_PRIORITY";
  }

  return "BALANCED_WATCH";
}

export function buildSchoolReport(
  schoolId: string,
  radiusKm = 2
): SchoolSafetyNetReport | null {
  const school = findSchool(schoolId);
  if (!school) {
    return null;
  }

  const academyEntries = withinRadius(
    getAcademyCandidates(school.coordinate, radiusKm),
    school.coordinate,
    radiusKm
  );
  const resourceEntries = withinRadius(learningResources, school.coordinate, radiusKm);
  const transitStopCount = withinRadius(transitStops, school.coordinate, 0.6).length;
  const safetyZoneCount = withinRadius(safetyZones, school.coordinate, 0.5).length;

  const nearbyAcademies = academyEntries.map((entry) => entry.item);
  const nearbyResources = resourceEntries.map((entry) => entry.item);
  const evidence = buildEvidence(
    nearbyAcademies,
    nearbyResources,
    transitStopCount,
    safetyZoneCount
  );
  const metrics = computeMetrics(evidence);
  const score = computeSafetyNetScore(metrics);
  const risk = classifyRisk(score, evidence, metrics);

  return {
    school,
    radiusKm,
    score,
    risk,
    metrics,
    evidence,
    nearbyAcademies,
    nearbyResources,
    recommendations: buildRecommendations(risk, evidence, metrics, school),
    dataNotes: [
      "학원 성과, 합격률, 후기는 데이터에 없어 평가하지 않습니다.",
      "학원비는 공개된 월 비용만 정리했으며 비공개 항목은 따로 알려줍니다.",
      "실제로 쓰기 전 원천 데이터 갱신일을 함께 확인해야 합니다."
    ]
  };
}

function buildRecommendations(
  risk: RiskType,
  evidence: Evidence,
  metrics: SafetyMetrics,
  school: School
) {
  const result: string[] = [];

  if (risk === "PRIVATE_EDUCATION_DESERT") {
    result.push("학교 방과후와 온라인 무료 강좌를 먼저 찾아보세요.");
    result.push("찾아가는 학습클리닉을 열면 빈자리를 메울 수 있어요.");
  }

  if (risk === "HIGH_COST_HOTSPOT") {
    result.push("학원비가 예산을 넘는지 먼저 확인해요.");
    result.push("무료 멘토링을 붙이면 비용 부담을 낮출 수 있어요.");
  }

  if (risk === "PUBLIC_SUPPORT_PRIORITY") {
    result.push("도서관, 청소년센터, 빈 교실을 저녁 배움터로 묶어보세요.");
  }

  if (metrics.diversity < 45) {
    result.push("코딩, 예체능, 독서논술처럼 다른 과목을 보태면 좋아요.");
  }

  if (evidence.disclosedFeeRate < 75) {
    result.push("학원비 비공개가 많아요. 상담 전 총비용을 꼭 확인해요.");
  }

  if (result.length === 0) {
    result.push(`${school.name} 주변은 큰 걱정이 적어요. 학원비 변화만 살펴보면 돼요.`);
  }

  return result;
}

function destinationPoint(center: LatLng, bearingDegrees: number, distanceKmValue: number): LatLng {
  const angularDistance = distanceKmValue / EARTH_RADIUS_KM;
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat1 = (center.lat * Math.PI) / 180;
  const lng1 = (center.lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (((lng2 * 180) / Math.PI + 540) % 360) - 180
  };
}

function walkingCirclePolygon(
  center: LatLng,
  radiusKm = WALKING_30_MIN_RADIUS_KM,
  segments = 72
): LatLng[] {
  const points = Array.from({ length: segments }, (_, index) =>
    destinationPoint(center, (index / segments) * 360, radiusKm)
  );

  return [...points, points[0]];
}

export function buildAreaScores(): AreaScore[] {
  return schools.map((school) => {
    const report = buildSchoolReport(school.id, WALKING_30_MIN_RADIUS_KM);
    if (!report) {
      throw new Error(`Missing report for ${school.id}`);
    }

    return {
      id: `area-${school.id}`,
      areaKey: `${school.region}-${school.district}-${school.id}`,
      label: `${school.name} ${WALKING_30_MIN_LABEL}`,
      region: school.region,
      district: school.district,
      center: school.coordinate,
      polygon: walkingCirclePolygon(school.coordinate),
      score: report.score,
      risk: report.risk,
      metrics: report.metrics,
      evidence: report.evidence,
      computedAt: new Date("2026-04-24T00:00:00+09:00").toISOString()
    };
  });
}

export function getAcademyTrustCard(id: string) {
  const academy = academies.find((entry) => entry.id === id);
  if (!academy) {
    return null;
  }

  const warnings = [
    academy.status !== "등록" ? `현재 등록상태가 ${academy.status}입니다.` : null,
    !academy.feeDisclosed ? "학원비가 공개되지 않았습니다." : null,
    academy.monthlyFee != null && academy.monthlyFee >= 450000
      ? "동네 평균보다 학원비 부담이 높을 수 있습니다."
      : null
  ].filter(Boolean);

  return {
    academy,
    trustSignals: [
      `NEIS 학원 지정번호: ${academy.neisAcademyId}`,
      `등록상태: ${academy.status}`,
      `학원비 공개: ${academy.feeDisclosed ? "예" : "아니오"}`,
      `데이터 기준일: ${academy.sourceUpdatedAt}`
    ],
    warnings,
    dataLimit:
      "이 카드는 행정 등록, 공개 학원비, 거리만 설명하며 학원 성과나 만족도는 평가하지 않습니다."
  };
}

export function findSchool(id: string) {
  return schoolDirectory.find((school) => school.id === id) ?? null;
}

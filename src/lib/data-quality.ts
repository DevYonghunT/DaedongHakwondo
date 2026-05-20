import {
  dataMeta,
  dataMode,
  learningResources,
  safetyZones,
  schoolDirectory,
  schools
} from "@/lib/public-data";
import { getAcademyUniverse } from "@/lib/academy-universe";

export function getDataQualitySummary() {
  const academyUniverse = getAcademyUniverse();
  const feeHidden = academyUniverse.filter((academy) => !academy.feeDisclosed).length;
  const inactive = academyUniverse.filter((academy) => academy.status !== "등록").length;
  const lowResourceSchools = schools.filter((school) => {
    const districtResources = learningResources.filter(
      (resource) => resource.region === school.region && resource.district === school.district
    );
    return districtResources.length === 0;
  });
  const safetyWithoutCctv = safetyZones.filter((zone) => !zone.cctvInstalled).length;

  return {
    generatedAt: new Date().toISOString(),
    dataMode,
    dataMeta,
    sourceCoverage: {
      schools: schoolDirectory.length,
      analysisSchools: schools.length,
      academies: academyUniverse.length,
      learningResources: learningResources.length,
      safetyZones: safetyZones.length
    },
    issues: [
      {
        severity: feeHidden > 0 ? "warning" : "ok",
        issueType: "TUITION_DISCLOSURE",
        summary: `학원비 비공개 학원 ${feeHidden}곳`,
        impact: "상담 전에 총비용을 확인하라고 알려줘요."
      },
      {
        severity: inactive > 0 ? "warning" : "ok",
        issueType: "REGISTRATION_STATUS",
        summary: `휴원·폐원 상태 학원 ${inactive}곳`,
        impact: "가까운 학원 점수에는 운영 중인 곳만 넣어요."
      },
      {
        severity: lowResourceSchools.length > 0 ? "warning" : "ok",
        issueType: "PUBLIC_RESOURCE_GAP",
        summary: `같은 시군구에 무료 배움터가 부족한 학교 ${lowResourceSchools.length}곳`,
        impact: "배움터 늘려보기에서 먼저 살펴볼 곳으로 보여줘요."
      },
      {
        severity: safetyWithoutCctv > 0 ? "warning" : "ok",
        issueType: "SAFETY_ZONE_DETAIL",
        summary: `CCTV 미설치 보호구역 ${safetyWithoutCctv}건`,
        impact: "오가는 길은 현장 교통량과 함께 확인하면 좋아요."
      }
    ]
  };
}

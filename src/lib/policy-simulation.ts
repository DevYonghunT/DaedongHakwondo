import { z } from "zod";
import { WALKING_30_MIN_RADIUS_KM } from "@/lib/constants";
import { buildSchoolReport, findSchool } from "@/lib/scoring";

export const PolicySimulationRequest = z.object({
  schoolId: z.string().min(1),
  scenarioName: z.string().min(2).max(80).default("방과후 무료 배움터 늘리기"),
  programType: z.enum(["MATH_AFTER_SCHOOL", "PUBLIC_LEARNING_CENTER", "MENTORING"]),
  slots: z.number().int().min(5).max(500),
  radiusKm: z.number().min(0.5).max(5).default(WALKING_30_MIN_RADIUS_KM)
});

export type PolicySimulationRequest = z.infer<typeof PolicySimulationRequest>;

export function runPolicySimulation(input: PolicySimulationRequest) {
  const school = findSchool(input.schoolId);
  const report = buildSchoolReport(input.schoolId, input.radiusKm);

  if (!school || !report) {
    return null;
  }

  const currentGapRate = Math.max(0.08, (100 - report.score) / 120);
  const estimatedGapStudents = Math.round(school.studentCount * currentGapRate);
  const effectiveSlots =
    input.programType === "PUBLIC_LEARNING_CENTER"
      ? Math.round(input.slots * 1.25)
      : input.programType === "MENTORING"
        ? Math.round(input.slots * 0.85)
        : input.slots;
  const reducedStudents = Math.min(estimatedGapStudents, effectiveSlots);
  const afterGapStudents = Math.max(0, estimatedGapStudents - reducedStudents);
  const scoreLift = Math.round((reducedStudents / Math.max(1, school.studentCount)) * 100);

  return {
    id: `sim-${school.id}-${Date.now()}`,
    scenarioName: input.scenarioName,
    school,
    input,
    result: {
      estimatedGapStudents,
      reducedStudents,
      afterGapStudents,
      beforeScore: report.score,
      afterScore: Math.min(100, report.score + scoreLift),
      recommendedOperation:
        input.programType === "PUBLIC_LEARNING_CENTER"
          ? "도서관·학교 빈 교실 저녁 배움터"
          : input.programType === "MENTORING"
            ? "대학생·퇴직교원 소그룹 멘토링"
            : "학교 방과후 수학 보충반",
      evidence: report.evidence
    }
  };
}

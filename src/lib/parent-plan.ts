import { z } from "zod";
import { formatWon } from "@/lib/tuition";
import { academies, learningResources } from "@/lib/public-data";
import { distanceKm, findSchool, withinRadius } from "@/lib/scoring";
import { fuzzCoordinate } from "@/lib/privacy";
import { WALKING_30_MIN_RADIUS_KM } from "@/lib/constants";

export const ParentPlanRequest = z.object({
  schoolId: z.string().min(1),
  budget: z.number().int().min(0).max(3000000),
  interests: z.array(z.string()).min(1).max(5),
  radiusKm: z.number().min(0.5).max(5).default(WALKING_30_MIN_RADIUS_KM),
  homeCoordinate: z
    .object({
      lat: z.number().min(33).max(39),
      lng: z.number().min(124).max(132)
    })
    .optional()
});

export type ParentPlanRequest = z.infer<typeof ParentPlanRequest>;

export function buildParentPlan(input: ParentPlanRequest) {
  const school = findSchool(input.schoolId);
  if (!school) {
    return null;
  }

  const homeCoordinate = input.homeCoordinate
    ? fuzzCoordinate(input.homeCoordinate)
    : undefined;

  const academyOptions = withinRadius(academies, school.coordinate, input.radiusKm)
    .map((entry) => ({
      academy: entry.item,
      distanceKm: Number(entry.distance.toFixed(2)),
      overBudget:
        entry.item.monthlyFee == null ? false : entry.item.monthlyFee > input.budget,
      interestMatch: input.interests.some(
        (interest) =>
          entry.item.group.includes(interest) ||
          entry.item.subject.includes(interest) ||
          entry.item.course.includes(interest)
      )
    }))
    .filter((entry) => entry.interestMatch)
    .sort((a, b) => {
      const budgetDelta =
        Number(a.overBudget) - Number(b.overBudget) ||
        (a.academy.monthlyFee ?? Number.MAX_SAFE_INTEGER) -
          (b.academy.monthlyFee ?? Number.MAX_SAFE_INTEGER);
      return budgetDelta || a.distanceKm - b.distanceKm;
    })
    .slice(0, 5);

  const alternatives = withinRadius(learningResources, school.coordinate, input.radiusKm)
    .map((entry) => ({
      resource: entry.item,
      distanceKm: Number(entry.distance.toFixed(2)),
      matchedTags: entry.item.tags.filter((tag) =>
        input.interests.some((interest) => tag.includes(interest) || interest.includes(tag))
      )
    }))
    .sort((a, b) => b.matchedTags.length - a.matchedTags.length || a.distanceKm - b.distanceKm)
    .slice(0, 4);

  const costWarnings = academyOptions
    .filter((option) => option.academy.monthlyFee == null || option.overBudget)
    .map((option) =>
      option.academy.monthlyFee == null
        ? `${option.academy.name}: 학원비가 비공개예요. 상담 전에 총비용을 확인해요.`
        : `${option.academy.name}: 월 ${formatWon(option.academy.monthlyFee)}로 예산 ${formatWon(input.budget)}을 넘어요.`
    );

  const commuteRisks = academyOptions
    .filter((option) => option.distanceKm > 1.5)
    .map(
      (option) =>
        `${option.academy.name}: 학교에서 ${option.distanceKm}km예요. 저녁 이동길을 확인해요.`
    );

  const homeDistanceNote = homeCoordinate
    ? `입력 위치는 저장하지 않고 250m 격자로 둔화했습니다. 학교까지 약 ${distanceKm(
        homeCoordinate,
        school.coordinate
      ).toFixed(1)}km입니다.`
    : "정확한 집주소 없이 걸어서 30분 안쪽만 살펴봤어요.";

  return {
    school,
    privateOptions: academyOptions,
    publicAlternatives: alternatives,
    costWarnings:
      costWarnings.length > 0
        ? costWarnings
        : ["입력 예산을 넘는 공개 학원비는 없어요."],
    commuteRisks:
      commuteRisks.length > 0
        ? commuteRisks
        : ["학교에서 먼 학원은 뒤로 보냈어요."],
    nextActions: [
      "학원비가 비공개이면 월비용과 교재비를 따로 확인해요.",
      "무료 배움터를 먼저 보고 부족한 과목만 학원으로 보완해요.",
      "저녁 이동이 필요하면 정류장과 보호구역을 확인해요."
    ],
    privacyNote: homeDistanceNote
  };
}

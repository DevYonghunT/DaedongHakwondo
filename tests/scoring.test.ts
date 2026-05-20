import { describe, expect, it } from "vitest";
import { WALKING_30_MIN_LABEL, WALKING_30_MIN_RADIUS_KM } from "../src/lib/constants";
import { buildAreaScores, buildSchoolReport, distanceKm } from "../src/lib/scoring";
import { schoolDirectory, schools } from "../src/lib/public-data";

describe("safety net scoring", () => {
  it("builds a bounded report for a public-data school", () => {
    const report = buildSchoolReport(schools[0].id, WALKING_30_MIN_RADIUS_KM);

    expect(report).not.toBeNull();
    expect(report?.score).toBeGreaterThanOrEqual(0);
    expect(report?.score).toBeLessThanOrEqual(100);
    expect(report?.metrics.accessibility).toBeGreaterThanOrEqual(0);
    expect(report?.metrics.accessibility).toBeLessThanOrEqual(100);
  });

  it("keeps area scoring aligned with the loaded school set", () => {
    expect(buildAreaScores()).toHaveLength(schools.length);
  });

  it("draws each map area as a walking 30-minute circle", () => {
    const area = buildAreaScores()[0];

    expect(area.label).toContain(WALKING_30_MIN_LABEL);
    expect(area.polygon.length).toBeGreaterThan(12);
    expect(distanceKm(area.center, area.polygon[0])).toBeCloseTo(
      WALKING_30_MIN_RADIUS_KM,
      1
    );
  });

  it("uses one of the declared risk labels", () => {
    const report = buildSchoolReport(schools[0].id, WALKING_30_MIN_RADIUS_KM);

    expect([
      "PRIVATE_EDUCATION_DESERT",
      "HIGH_COST_HOTSPOT",
      "CHOICE_RICH",
      "PUBLIC_SUPPORT_PRIORITY",
      "BALANCED_WATCH"
    ]).toContain(report?.risk);
  });

  it("uses the full academy universe for schools outside the map seed set", () => {
    const gamilHigh = schoolDirectory.find(
      (school) => school.region === "경기도" && school.district === "하남시" && school.name === "감일고등학교"
    );

    expect(gamilHigh).toBeDefined();

    const report = buildSchoolReport(gamilHigh!.id, WALKING_30_MIN_RADIUS_KM);

    expect(report?.evidence.registeredAcademyCount).toBeGreaterThan(0);
    expect(
      report?.nearbyAcademies.some(
        (academy) => academy.name.includes("감일") || academy.address.includes("감일")
      )
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { filterSchoolDirectory } from "../src/lib/school-directory";

describe("school directory", () => {
  it("uses the full school directory for district selection", () => {
    const result = filterSchoolDirectory({
      region: "서울특별시",
      district: "송파구",
      limit: 500
    });

    expect(result.total).toBeGreaterThan(50);
    expect(result.schools.map((school) => school.name)).toContain("덕수고등학교");
  });
});

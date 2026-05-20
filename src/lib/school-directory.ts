import { schoolDirectory } from "@/lib/public-data";
import type { School } from "@/lib/types";

const ALL_FILTER = "__ALL__";

export type SchoolDirectoryQuery = {
  region?: string;
  district?: string;
  q?: string;
  limit?: number;
};

export type SchoolDirectoryResult = {
  regions: string[];
  districts: string[];
  schools: School[];
  total: number;
  limit: number;
};

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "ko")
  );
}

function normalizeSearch(value: string) {
  return value.trim().replace(/\s+/g, "").toLocaleLowerCase("ko-KR");
}

export function filterSchoolDirectory({
  region = ALL_FILTER,
  district = ALL_FILTER,
  q = "",
  limit = 300
}: SchoolDirectoryQuery): SchoolDirectoryResult {
  const normalizedQuery = normalizeSearch(q);
  const boundedLimit = Math.max(1, Math.min(1000, limit));

  const filtered = schoolDirectory.filter((school) => {
    const regionMatches = region === ALL_FILTER || school.region === region;
    const districtMatches = district === ALL_FILTER || school.district === district;
    const queryMatches =
      normalizedQuery.length === 0 ||
      normalizeSearch(`${school.name}${school.region}${school.district}`).includes(
        normalizedQuery
      );

    return regionMatches && districtMatches && queryMatches;
  });

  const regionSchools =
    region === ALL_FILTER
      ? schoolDirectory
      : schoolDirectory.filter((school) => school.region === region);

  return {
    regions: uniqueSorted(schoolDirectory.map((school) => school.region)),
    districts:
      region === ALL_FILTER
        ? []
        : uniqueSorted(regionSchools.map((school) => school.district)),
    schools: filtered.slice(0, boundedLimit),
    total: filtered.length,
    limit: boundedLimit
  };
}

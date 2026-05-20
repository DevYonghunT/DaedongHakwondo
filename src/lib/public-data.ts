import {
  academies as demoAcademies,
  learningResources,
  safetyZones,
  schools as demoSchools,
  transitStops
} from "@/lib/sample-data";
import {
  importedAcademies,
  importedDataMeta,
  importedSchoolDirectory,
  importedSchools
} from "@/lib/generated-dump-data";

export const dataMode = importedSchools.length > 0 ? "imported-dump" : "demo";

export const dataMeta =
  importedSchools.length > 0
    ? importedDataMeta
    : {
        source: "built-in-demo-fixtures",
        importedAt: "not-imported",
        totalSchools: demoSchools.length,
        totalAcademies: demoAcademies.length,
        selectedSchools: demoSchools.length,
        selectedAcademies: demoAcademies.length
      };

export const schools = importedSchools.length > 0 ? importedSchools : demoSchools;
export const schoolDirectory =
  importedSchoolDirectory.length > 0 ? importedSchoolDirectory : demoSchools;
export const academies =
  importedAcademies.length > 0 ? importedAcademies : demoAcademies;
export { learningResources, safetyZones, transitStops };

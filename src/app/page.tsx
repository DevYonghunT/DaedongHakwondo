import { SafetyNetApp } from "@/components/SafetyNetApp";
import {
  dataMeta,
  dataMode,
  learningResources,
  schools
} from "@/lib/public-data";
import { buildAreaScores, buildSchoolReport } from "@/lib/scoring";
import { filterSchoolDirectory } from "@/lib/school-directory";
import { WALKING_30_MIN_RADIUS_KM } from "@/lib/constants";

export default function Home() {
  const areas = buildAreaScores();
  const initialReport = buildSchoolReport(schools[0].id, WALKING_30_MIN_RADIUS_KM);
  const initialSchoolSelector = filterSchoolDirectory({
    region: initialReport?.school.region,
    limit: 300
  });

  return (
    <SafetyNetApp
      areas={areas}
      schools={schools}
      learningResources={learningResources}
      initialReport={initialReport}
      dataMode={dataMode}
      dataMeta={dataMeta}
      initialMapAcademies={initialReport?.nearbyAcademies ?? []}
      initialSchoolSelector={initialSchoolSelector}
    />
  );
}

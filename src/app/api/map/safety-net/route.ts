import { NextResponse } from "next/server";
import { WALKING_30_MIN_LABEL } from "@/lib/constants";
import {
  academies,
  dataMeta,
  dataMode,
  learningResources,
  schools
} from "@/lib/public-data";
import { buildAreaScores } from "@/lib/scoring";

export async function GET() {
  return NextResponse.json({
    areas: buildAreaScores(),
    schools,
    academies,
    learningResources,
    meta: {
      mode: dataMode,
      imported: dataMeta,
      source: "NEIS 학원교습소정보, NEIS 학교기본정보, 공공데이터포털 보조 데이터 설계",
      privacy: `사용자 주소는 서버에 저장하지 않고 ${WALKING_30_MIN_LABEL} 범위 또는 250m 격자 좌표만 사용합니다.`
    }
  });
}

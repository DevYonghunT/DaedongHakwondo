// AI 분석 프롬프트 템플릿
// Claude API를 통한 지역 사교육 현황 분석에 사용

/**
 * 지역 분석 프롬프트
 * - region_name: 분석 대상 지역명 (예: "서울특별시 강남구")
 * - data_json: 해당 지역의 학원 통계 데이터 (JSON 문자열)
 */
export const REGION_ANALYSIS_PROMPT = (regionName: string, dataJson: string): string => `
당신은 대한민국 사교육 데이터 분석 전문가입니다.
아래 지역의 학원 데이터를 분석하여 교육 현황 인사이트를 제공해주세요.

## 분석 대상 지역
${regionName}

## 데이터
${dataJson}

## 요청 형식
아래 JSON 형식으로 정확히 응답해주세요. JSON만 반환하고 다른 텍스트는 포함하지 마세요.

{
  "summary": "이 지역의 사교육 현황을 3-4문장으로 요약해주세요. 전체 학원 수, 가장 많은 분야, 특징적인 패턴 등을 포함합니다.",
  "realm_analysis": [
    {
      "realm": "분야명",
      "count": 학원수,
      "ratio": 비율(소수점),
      "avg_ratio": 시도평균비율(소수점),
      "insight": "시도 평균 대비 이 분야의 특징을 한 문장으로 설명"
    }
  ],
  "school_suggestions": [
    {
      "program": "방과후 프로그램 이름",
      "reason": "이 프로그램을 추천하는 이유 (데이터 기반)",
      "target": "대상 학년/연령"
    },
    {
      "program": "방과후 프로그램 이름",
      "reason": "이 프로그램을 추천하는 이유 (데이터 기반)",
      "target": "대상 학년/연령"
    },
    {
      "program": "방과후 프로그램 이름",
      "reason": "이 프로그램을 추천하는 이유 (데이터 기반)",
      "target": "대상 학년/연령"
    }
  ],
  "parent_info": "학부모가 알아두면 좋을 정보를 2-3문장으로 작성. 해당 지역의 사교육 트렌드, 비용 대비 효과, 주의할 점 등을 포함합니다.",
  "data_note": "이 분석은 나이스 교육정보 개방포털의 공공데이터를 기반으로 합니다. 실제 학원의 교육 품질, 강사 역량 등 정성적 요소는 반영되지 않았으며, 데이터 수집 시점에 따라 현재 상황과 다를 수 있습니다."
}

## 분석 지침
1. 데이터에 기반한 객관적 분석을 제공하세요.
2. 시도 평균 대비 높거나 낮은 분야를 명확히 비교하세요.
3. 방과후 프로그램 제안은 해당 지역에서 사교육 수요가 높은 분야를 보완하는 방향으로 제안하세요.
4. 학부모 관점 정보는 실질적이고 도움이 되는 내용으로 작성하세요.
5. 수치가 부족한 경우 "데이터 부족"으로 표시하되, 가능한 범위에서 분석하세요.
`;

/**
 * 비교 분석 프롬프트
 * - region1Name: 첫 번째 지역명
 * - region2Name: 두 번째 지역명
 * - data1Json: 첫 번째 지역 데이터
 * - data2Json: 두 번째 지역 데이터
 */
export const COMPARISON_ANALYSIS_PROMPT = (
  region1Name: string,
  region2Name: string,
  data1Json: string,
  data2Json: string
): string => `
당신은 대한민국 사교육 데이터 분석 전문가입니다.
아래 두 지역의 학원 데이터를 비교 분석해주세요.

## 지역 1: ${region1Name}
${data1Json}

## 지역 2: ${region2Name}
${data2Json}

## 요청 형식
아래 JSON 형식으로 정확히 응답해주세요. JSON만 반환하고 다른 텍스트는 포함하지 마세요.

{
  "comparison_summary": "두 지역의 사교육 환경을 3-4문장으로 비교 요약해주세요.",
  "key_differences": [
    "핵심 차이점 1",
    "핵심 차이점 2",
    "핵심 차이점 3"
  ],
  "recommendation": "두 지역의 특성에 맞는 교육 관련 조언을 2-3문장으로 작성해주세요."
}
`;

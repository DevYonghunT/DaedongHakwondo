// 앱 전역 상수 정의

/**
 * DB 원본 분야명 → 사용자 친화적 그룹명 매핑
 * DB 데이터를 수정하지 않고 프론트에서 변환
 */
export const REALM_GROUP_MAP: Record<string, string> = {
  // academy 테이블 + districtStats 테이블의 모든 분야명 커버
  '입시.검정 및 보습': '학습/입시',
  '예능(대)': '예체능',
  '기예(대)': '예체능',        // 예능 계열로 통합
  '외국어': '외국어',
  '국제화': '외국어',          // 외국어로 통합
  '직업기술': '직업/자격',
  '종합(대)': '종합학원',
  '독서실': '독서실',
  '기타': '기타',
  '기타(대)': '기타',          // 기타로 통합
  '미분류': '기타',            // 기타로 통합
  '정보': '코딩/IT',
  '사고력/교양': '사고력/논술',
  '인문사회(대)': '사고력/논술', // 사고력/논술로 통합
  '특수교육(대)': '특수교육',
};

/** DB 원본 분야명을 사용자 친화적 그룹명으로 변환 (이미 그룹명이면 그대로 반환) */
export function getRealmGroup(dbRealm: string): string {
  // 이미 그룹명인 경우 그대로 반환
  if (REALM_COLORS[dbRealm]) return dbRealm;
  return REALM_GROUP_MAP[dbRealm] || '기타';
}

/** 그룹별 색상 — 무지개색 기반, 모든 분야가 명확히 구분됨 */
export const REALM_COLORS: Record<string, string> = {
  '학습/입시': '#2563EB',    // 파랑 (blue-600)
  '예체능': '#9333EA',       // 보라 (purple-600)
  '외국어': '#EC4899',       // 핑크 (pink-500)
  '직업/자격': '#EA580C',    // 주황 (orange-600)
  '종합학원': '#0D9488',     // 청록 (teal-600)
  '독서실': '#CA8A04',       // 노랑 (yellow-600)
  '기타': '#78716C',         // 갈색 (stone-500)
  '코딩/IT': '#0891B2',      // 시안 (cyan-600)
  '사고력/논술': '#16A34A',   // 초록 (green-600)
  '특수교육': '#DC2626',     // 빨강 (red-600)
};

/** 분야 한글 레이블 (DB 원본 → 짧은 이름, 하위 호환용) */
export const REALM_LABELS: Record<string, string> = {
  // DB 원본명으로 조회 시
  '입시.검정 및 보습': '학습/입시',
  '예능(대)': '예체능',
  '기예(대)': '예체능',
  '외국어': '외국어',
  '국제화': '외국어',
  '직업기술': '직업/자격',
  '종합(대)': '종합학원',
  '독서실': '독서실',
  '기타': '기타',
  '기타(대)': '기타',
  '미분류': '기타',
  '정보': '코딩/IT',
  '사고력/교양': '사고력/논술',
  '인문사회(대)': '사고력/논술',
  '특수교육(대)': '특수교육',
  // 그룹명으로 조회 시 (자기 자신 반환)
  '학습/입시': '학습/입시',
  '예체능': '예체능',
  '직업/자격': '직업/자격',
  '종합학원': '종합학원',
  '코딩/IT': '코딩/IT',
  '사고력/논술': '사고력/논술',
  '특수교육': '특수교육',
};

/** DB 원본 분야명으로 색상을 조회 (그룹명으로 변환 후 조회) */
export function getRealmColor(dbRealm: string): string {
  const group = getRealmGroup(dbRealm);
  return REALM_COLORS[group] || REALM_COLORS['기타'] || '#6B7280';
}

/** DB 원본 분야명으로 레이블을 조회 */
export function getRealmLabel(dbRealm: string): string {
  return REALM_LABELS[dbRealm] || getRealmGroup(dbRealm);
}

/** 모든 그룹 분야 목록 */
export const ALL_REALMS = Object.keys(REALM_COLORS);

/**
 * API 응답의 분야별 데이터를 그룹으로 통합
 * 예: 예능(대) 100 + 기예(대) 20 → 예체능 120
 */
export function groupRealmData<T extends { realm: string; count: number }>(
  items: T[]
): Array<{ realm: string; count: number }> {
  const grouped: Record<string, number> = {};
  items.forEach((item) => {
    const group = getRealmGroup(item.realm);
    grouped[group] = (grouped[group] || 0) + item.count;
  });
  return Object.entries(grouped)
    .map(([realm, count]) => ({ realm, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 그룹명 → DB 원본 분야명 목록 (역매핑)
 * API 필터링 시 그룹명을 DB 원본명으로 변환할 때 사용
 */
export function getDbRealmsForGroup(group: string): string[] {
  return Object.entries(REALM_GROUP_MAP)
    .filter(([, g]) => g === group)
    .map(([dbName]) => dbName);
}

/** 시도교육청 코드 목록 */
export const EDUCATION_OFFICE_CODES: Array<{ code: string; name: string }> = [
  { code: 'B10', name: '서울특별시교육청' },
  { code: 'C10', name: '부산광역시교육청' },
  { code: 'D10', name: '대구광역시교육청' },
  { code: 'E10', name: '인천광역시교육청' },
  { code: 'F10', name: '광주광역시교육청' },
  { code: 'G10', name: '대전광역시교육청' },
  { code: 'H10', name: '울산광역시교육청' },
  { code: 'I10', name: '세종특별자치시교육청' },
  { code: 'J10', name: '경기도교육청' },
  { code: 'K10', name: '강원특별자치도교육청' },
  { code: 'M10', name: '충청북도교육청' },
  { code: 'N10', name: '충청남도교육청' },
  { code: 'P10', name: '전북특별자치도교육청' },
  { code: 'Q10', name: '전라남도교육청' },
  { code: 'R10', name: '경상북도교육청' },
  { code: 'S10', name: '경상남도교육청' },
  { code: 'T10', name: '제주특별자치도교육청' },
];

/** 기본 지도 중심 좌표 (서울시청) */
export const DEFAULT_CENTER = {
  lat: 37.5665,
  lng: 126.9780,
};

/** 기본 지도 확대 레벨 */
export const DEFAULT_ZOOM_LEVEL = 8;

/** API 요청 제한 수 */
export const DEFAULT_ACADEMY_LIMIT = 500;

/** 반경 검색 옵션 (km) */
export const RADIUS_OPTIONS = [1, 2, 3, 5] as const;

/** AI 리포트 캐시 유효 기간 (일) */
export const REPORT_CACHE_DAYS = 7;

/** 시도 이름 매핑 (교육청코드 → 시도명) */
export const OFFICE_CODE_TO_SIDO: Record<string, string> = {
  'B10': '서울특별시',
  'C10': '부산광역시',
  'D10': '대구광역시',
  'E10': '인천광역시',
  'F10': '광주광역시',
  'G10': '대전광역시',
  'H10': '울산광역시',
  'I10': '세종특별자치시',
  'J10': '경기도',
  'K10': '강원특별자치도',
  'M10': '충청북도',
  'N10': '충청남도',
  'P10': '전북특별자치도',
  'Q10': '전라남도',
  'R10': '경상북도',
  'S10': '경상남도',
  'T10': '제주특별자치도',
};

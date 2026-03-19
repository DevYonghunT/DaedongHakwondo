// 앱 전역 상수 정의

/** 학원 분야별 색상 매핑 */
export const REALM_COLORS: Record<string, string> = {
  '입시·검정 및 보습': '#3B82F6', // blue-500
  '예능': '#8B5CF6',              // violet-500
  '체육': '#10B981',              // emerald-500
  '외국어': '#F59E0B',            // amber-500
  '국제화': '#EC4899',            // pink-500
  '직업기술': '#6366F1',          // indigo-500
  '기타': '#6B7280',              // gray-500
};

/** 분야 한글 레이블 */
export const REALM_LABELS: Record<string, string> = {
  '입시·검정 및 보습': '입시/보습',
  '예능': '예능',
  '체육': '체육',
  '외국어': '외국어',
  '국제화': '국제화',
  '직업기술': '직업기술',
  '기타': '기타',
};

/** 모든 분야 목록 */
export const ALL_REALMS = Object.keys(REALM_COLORS);

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

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/schools/[id]/detail
 * 학교 상세 정보 조회 (DB + 학교알리미 + NEIS 급식/학사일정 + 주변 학원)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. DB에서 학교 기본정보 조회
    const school = await prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      return NextResponse.json(
        { error: '학교를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 병렬로 외부 API 호출
    const [schoolInfoResult, mealResult, scheduleResult, nearbyResult] =
      await Promise.allSettled([
        fetchSchoolInfo(school),
        fetchMeal(school.atptOfcdcScCode, school.sdSchulCode),
        fetchSchedule(school.atptOfcdcScCode, school.sdSchulCode),
        fetchNearbyAcademies(school.latitude, school.longitude),
      ]);

    // 학교알리미 데이터
    const schoolInfo =
      schoolInfoResult.status === 'fulfilled' ? schoolInfoResult.value : null;

    // 급식 데이터
    const meal =
      mealResult.status === 'fulfilled' ? mealResult.value : null;

    // 학사일정 데이터
    const schedule =
      scheduleResult.status === 'fulfilled' ? scheduleResult.value : [];

    // 주변 학원 데이터
    const nearbyAcademies =
      nearbyResult.status === 'fulfilled' ? nearbyResult.value : { total: 0, byRealm: [] };

    return NextResponse.json({
      school: {
        id: school.id,
        name: school.schoolNm,
        kind: school.schoolKind,
        address: school.address,
        lat: school.latitude,
        lng: school.longitude,
        coedu: school.coeduScNm,
        foundation: school.fondScNm,
        hsType: school.hsScNm,
        phone: schoolInfo?.phone || null,
        homepage: schoolInfo?.homepage || null,
        foundingDate: schoolInfo?.foundingDate || null,
        fax: schoolInfo?.fax || null,
      },
      meal,
      schedule,
      nearbyAcademies,
    });
  } catch (error) {
    console.error('학교 상세 조회 API 오류:', error);
    return NextResponse.json(
      { error: '학교 상세 정보 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// ── 시도명 → 학교알리미 sidoCode 매핑 ──
const SIDO_CODE_MAP: Record<string, string> = {
  '서울특별시': '11',
  '서울': '11',
  '부산광역시': '26',
  '부산': '26',
  '대구광역시': '27',
  '대구': '27',
  '인천광역시': '28',
  '인천': '28',
  '광주광역시': '29',
  '광주': '29',
  '대전광역시': '30',
  '대전': '30',
  '울산광역시': '31',
  '울산': '31',
  '세종특별자치시': '36',
  '세종': '36',
  '경기도': '41',
  '경기': '41',
  '강원특별자치도': '51',
  '강원도': '51',
  '강원': '51',
  '충청북도': '43',
  '충북': '43',
  '충청남도': '44',
  '충남': '44',
  '전북특별자치도': '52',
  '전라북도': '52',
  '전북': '52',
  '전라남도': '46',
  '전남': '46',
  '경상북도': '47',
  '경북': '47',
  '경상남도': '48',
  '경남': '48',
  '제주특별자치도': '50',
  '제주': '50',
};

// ── 학교종류 → schulKndCode 매핑 ──
const SCHOOL_KIND_CODE_MAP: Record<string, string> = {
  '초등학교': '02',
  '중학교': '03',
  '고등학교': '04',
  '특수학교': '05',
};

/**
 * 주소에서 시도명을 추출하여 sidoCode를 반환
 */
function getSidoCodeFromAddress(address: string | null): string | null {
  if (!address) return null;

  for (const [name, code] of Object.entries(SIDO_CODE_MAP)) {
    if (address.startsWith(name) || address.includes(name)) {
      return code;
    }
  }
  return null;
}

/**
 * 학교알리미 API에서 학교 기본정보 조회
 */
async function fetchSchoolInfo(
  school: {
    schoolNm: string;
    schoolKind: string | null;
    address: string | null;
  }
): Promise<{
  phone: string | null;
  homepage: string | null;
  foundingDate: string | null;
  fax: string | null;
} | null> {
  const apiKey = process.env.SCHOOL_INFO_API_KEY;
  if (!apiKey) return null;

  const sidoCode = getSidoCodeFromAddress(school.address);
  if (!sidoCode) return null;

  const schulKndCode = school.schoolKind
    ? SCHOOL_KIND_CODE_MAP[school.schoolKind]
    : null;

  try {
    let url = `https://www.schoolinfo.go.kr/openApi.do?apiKey=${apiKey}&apiType=0&sidoCode=${sidoCode}`;
    if (schulKndCode) {
      url += `&schulKndCode=${schulKndCode}`;
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    const schools = data?.schoolInfo || [];

    // 학교명으로 매칭
    const matched = schools.find(
      (s: Record<string, string>) =>
        s.SCHUL_NM === school.schoolNm ||
        s.SCHUL_NM?.replace(/\s/g, '') === school.schoolNm.replace(/\s/g, '')
    );

    if (!matched) return null;

    // 개교일 포맷: YYYYMMDD → YYYY.MM.DD
    const fondYmd = matched.FOND_YMD || null;
    const foundingDate = fondYmd
      ? `${fondYmd.slice(0, 4)}.${fondYmd.slice(4, 6)}.${fondYmd.slice(6, 8)}`
      : null;

    return {
      phone: matched.USER_TELNO || null,
      homepage: matched.HMPG_ADRES || null,
      foundingDate,
      fax: matched.PERC_FAXNO || null,
    };
  } catch (error) {
    console.warn('학교알리미 API 호출 실패:', error);
    return null;
  }
}

/**
 * NEIS API - 급식식단정보 조회
 */
async function fetchMeal(
  atptOfcdcScCode: string,
  sdSchulCode: string
): Promise<{
  date: string;
  menu: string[];
} | null> {
  const apiKey = process.env.NEIS_API_KEY;
  if (!apiKey) return null;

  try {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const todayStr = formatDateYMD(today);

    const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${apiKey}&Type=json&ATPT_OFCDC_SC_CODE=${atptOfcdcScCode}&SD_SCHUL_CODE=${sdSchulCode}&MLSV_YMD=${todayStr}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json();
    const mealInfo = data?.mealServiceDietInfo;
    if (!mealInfo || !mealInfo[1]?.row) return null;

    const row = mealInfo[1].row[0];
    const menuStr = row.DDISH_NM || '';

    // 메뉴 파싱: <br/> 태그로 분리, 알레르기 정보 제거
    const menu = menuStr
      .split(/<br\s*\/?>/)
      .map((item: string) => item.replace(/\([0-9.]+\)/g, '').trim())
      .filter((item: string) => item.length > 0);

    return {
      date: `${todayStr.slice(0, 4)}-${todayStr.slice(4, 6)}-${todayStr.slice(6, 8)}`,
      menu,
    };
  } catch (error) {
    console.warn('NEIS 급식 API 호출 실패:', error);
    return null;
  }
}

/**
 * NEIS API - 학사일정 조회 (이번 주)
 */
async function fetchSchedule(
  atptOfcdcScCode: string,
  sdSchulCode: string
): Promise<Array<{ date: string; event: string }>> {
  const apiKey = process.env.NEIS_API_KEY;
  if (!apiKey) return [];

  try {
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(today.getDate() + 7);

    const fromDate = formatDateYMD(today);
    const toDate = formatDateYMD(oneWeekLater);

    const url = `https://open.neis.go.kr/hub/SchoolSchedule?KEY=${apiKey}&Type=json&ATPT_OFCDC_SC_CODE=${atptOfcdcScCode}&SD_SCHUL_CODE=${sdSchulCode}&AA_FROM_YMD=${fromDate}&AA_TO_YMD=${toDate}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data = await res.json();
    const scheduleInfo = data?.SchoolSchedule;
    if (!scheduleInfo || !scheduleInfo[1]?.row) return [];

    return scheduleInfo[1].row.map(
      (row: { AA_YMD: string; EVENT_NM: string }) => ({
        date: `${row.AA_YMD.slice(0, 4)}-${row.AA_YMD.slice(4, 6)}-${row.AA_YMD.slice(6, 8)}`,
        event: row.EVENT_NM,
      })
    );
  } catch (error) {
    console.warn('NEIS 학사일정 API 호출 실패:', error);
    return [];
  }
}

/**
 * 주변 학원 통계 (반경 1km)
 */
async function fetchNearbyAcademies(
  latitude: number | null,
  longitude: number | null
): Promise<{ total: number; byRealm: Array<{ realm: string; count: number }> }> {
  if (!latitude || !longitude) {
    return { total: 0, byRealm: [] };
  }

  const radiusKm = 1;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / 88.8;

  const result = await prisma.academy.groupBy({
    by: ['realmScNm'],
    where: {
      latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
      longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta },
      NOT: [{ latitude: null }, { longitude: null }],
    },
    _count: { id: true },
  });

  const byRealm = result
    .map((r) => ({
      realm: r.realmScNm || '기타',
      count: r._count.id,
    }))
    .sort((a, b) => b.count - a.count);

  const total = byRealm.reduce((sum, r) => sum + r.count, 0);

  return { total, byRealm };
}

/**
 * Date → YYYYMMDD 문자열
 */
function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

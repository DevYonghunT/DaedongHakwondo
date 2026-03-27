import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRealmGroup } from '@/lib/constants';

/**
 * GET /api/schools/[id]/nearby
 * 학교 주변 학원 통계 조회
 *
 * Path Params:
 * - id: 학교 ID
 *
 * Query Params:
 * - radius: 반경 (km, 기본 2)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const radiusKm = Math.min(parseFloat(searchParams.get('radius') || '2'), 5);

    // 학교 조회
    const school = await prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        schoolNm: true,
        latitude: true,
        longitude: true,
        atptOfcdcScCode: true,
        address: true,
      },
    });

    if (!school) {
      return NextResponse.json(
        { error: '학교를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (!school.latitude || !school.longitude) {
      return NextResponse.json(
        { error: '학교 위치 정보가 없습니다' },
        { status: 400 }
      );
    }

    // 위도 1도 ≈ 111km, 경도 1도 ≈ 88.8km (한국 기준), 바운딩박스 20% 여유
    const latDelta = radiusKm / 111 * 1.2;
    const lngDelta = radiusKm / 88.8 * 1.2;

    const swLat = school.latitude - latDelta;
    const neLat = school.latitude + latDelta;
    const swLng = school.longitude - lngDelta;
    const neLng = school.longitude + lngDelta;

    // 주변 학원 조회 (사각형 바운딩 박스)
    const nearbyAcademies = await prisma.academy.findMany({
      where: {
        latitude: { gte: swLat, lte: neLat },
        longitude: { gte: swLng, lte: neLng },
        NOT: [{ latitude: null }, { longitude: null }],
      },
      select: {
        id: true,
        academyNm: true,
        realmScNm: true,
        latitude: true,
        longitude: true,
        tuitionFee: true,
        capacity: true,
      },
    });

    // Haversine 거리 계산으로 원형 필터링
    const academiesWithDistance = nearbyAcademies
      .map((academy) => {
        const distance = haversineDistance(
          school.latitude!,
          school.longitude!,
          academy.latitude!,
          academy.longitude!
        );
        return { ...academy, distance };
      })
      .filter((a) => a.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // 분야별 통계 계산 (새 분류 그룹 기준으로 통합)
    const realmCounts: Record<string, number> = {};
    let totalTuition = 0;
    let tuitionCount = 0;

    academiesWithDistance.forEach((academy) => {
      const group = getRealmGroup(academy.realmScNm || '기타');
      realmCounts[group] = (realmCounts[group] || 0) + 1;

      if (academy.tuitionFee && academy.tuitionFee > 0) {
        totalTuition += academy.tuitionFee;
        tuitionCount++;
      }
    });

    const total = academiesWithDistance.length;

    // 학교 주소에서 시/도 추출
    const schoolSido = school.address?.split(' ')[0] || '';

    // 해당 시/도의 분야별 학원 총 수 + 학교 총 수를 구해서 "학교당 평균 학원 개수" 계산
    const [sidoRealmStats, sidoSchoolCount] = await Promise.all([
      // 시/도 분야별 학원 총 수 (DB 원본 분류)
      prisma.districtStats.groupBy({
        by: ['realm'],
        where: schoolSido
          ? { sido: schoolSido }
          : { sido: { not: '' } },
        _sum: { academyCount: true },
      }),
      // 시/도 학교 수
      prisma.school.count({
        where: schoolSido
          ? { address: { startsWith: schoolSido }, latitude: { not: null } }
          : { latitude: { not: null } },
      }),
    ]);

    // 시/도 평균을 새 분류 그룹 기준으로 통합
    const sidoGroupTotals: Record<string, number> = {};
    sidoRealmStats.forEach((s) => {
      if (s.realm) {
        const group = getRealmGroup(s.realm);
        sidoGroupTotals[group] = (sidoGroupTotals[group] || 0) + (s._sum.academyCount || 0);
      }
    });

    // 그룹별 "학교당 평균 학원 개수" 계산
    const sidoAvgCounts: Record<string, number> = {};
    Object.entries(sidoGroupTotals).forEach(([group, total]) => {
      if (sidoSchoolCount > 0) {
        sidoAvgCounts[group] = total / sidoSchoolCount;
      }
    });

    // 분야별 개수 비교 (그룹 기준, 절대 개수)
    const allGroups = new Set([...Object.keys(realmCounts), ...Object.keys(sidoAvgCounts)]);
    const byRealm = Array.from(allGroups).map((group) => ({
      realm: group,
      count: realmCounts[group] || 0,
      avgCount: Math.round((sidoAvgCounts[group] || 0) * 10) / 10,
      ratio: total > 0 ? (realmCounts[group] || 0) / total : 0,
      avgRatio: 0,
    }));

    // 응답 데이터
    return NextResponse.json({
      total,
      sido: schoolSido,
      sidoSchoolCount,
      byRealm,
      avgTuition: tuitionCount > 0 ? Math.round(totalTuition / tuitionCount) : null,
      academies: academiesWithDistance.slice(0, 100).map((a) => ({
        id: a.id,
        academyNm: a.academyNm,
        realmScNm: a.realmScNm,
        distance: Math.round(a.distance * 100) / 100,
      })),
    });
  } catch (error) {
    console.error('주변 학원 조회 API 오류:', error);
    return NextResponse.json(
      { error: '주변 학원 데이터 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * Haversine 공식으로 두 좌표 간 거리 계산 (km)
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

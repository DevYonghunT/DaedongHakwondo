import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // 위도 1도 ≈ 111km, 경도 1도 ≈ 88.8km (한국 기준)
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / 88.8;

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

    // 분야별 통계 계산
    const realmCounts: Record<string, number> = {};
    let totalTuition = 0;
    let tuitionCount = 0;

    academiesWithDistance.forEach((academy) => {
      const realm = academy.realmScNm || '기타';
      realmCounts[realm] = (realmCounts[realm] || 0) + 1;

      if (academy.tuitionFee && academy.tuitionFee > 0) {
        totalTuition += academy.tuitionFee;
        tuitionCount++;
      }
    });

    const total = academiesWithDistance.length;

    // 시도 평균 비율 조회 (해당 교육청 기준)
    const sidoStats = await prisma.districtStats.groupBy({
      by: ['realm'],
      where: {
        sido: { not: '' },
      },
      _sum: {
        academyCount: true,
      },
    });

    const sidoTotal = sidoStats.reduce((sum, s) => sum + (s._sum.academyCount || 0), 0);
    const sidoRatios: Record<string, number> = {};
    sidoStats.forEach((s) => {
      if (s.realm) {
        sidoRatios[s.realm] = sidoTotal > 0 ? (s._sum.academyCount || 0) / sidoTotal : 0;
      }
    });

    // 분야별 비율 계산
    const byRealm = Object.entries(realmCounts).map(([realm, count]) => ({
      realm,
      count,
      ratio: total > 0 ? count / total : 0,
      avgRatio: sidoRatios[realm] || 0,
    }));

    // 응답 데이터
    return NextResponse.json({
      total,
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

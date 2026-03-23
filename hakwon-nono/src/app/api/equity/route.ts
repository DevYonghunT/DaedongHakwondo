import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 접근성 등급 판정
function getAccessLevel(nearbyCount: number): string {
  if (nearbyCount < 5) return '사각지대';
  if (nearbyCount < 10) return '부족';
  if (nearbyCount < 20) return '보통';
  return '충분';
}

// 분포 범위 정의
const DISTRIBUTION_RANGES = [
  { min: 0, max: 4, label: '사각지대', range: '0~4개' },
  { min: 5, max: 9, label: '부족', range: '5~9개' },
  { min: 10, max: 19, label: '보통', range: '10~19개' },
  { min: 20, max: 49, label: '충분', range: '20~49개' },
  { min: 50, max: Infinity, label: '매우 충분', range: '50개 이상' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sido = searchParams.get('sido') || '서울특별시';
    const radius = Math.min(Math.max(parseFloat(searchParams.get('radius') || '1'), 0.5), 5);

    // 위도 1도 ≈ 111km, 경도 1도 ≈ 88km (한국 위도 기준)
    // 바운딩 박스 필터용 대략적 변환값 (radius에 비례)
    const latDelta = radius / 111 * 1.2; // 20% 여유
    const lngDelta = radius / 88 * 1.2;

    // Haversine 공식으로 반경 내 학원 수 계산
    // 바운딩 박스로 먼저 필터링 후 정확한 거리 계산
    const schools = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        school_nm: string;
        school_kind: string | null;
        latitude: number;
        longitude: number;
        address: string | null;
        nearby_count: bigint;
      }>
    >(
      `SELECT s.id, s.school_nm, s.school_kind, s.latitude, s.longitude, s.address,
        (SELECT COUNT(*) FROM academies a
         WHERE a.latitude BETWEEN s.latitude - $2 AND s.latitude + $2
         AND a.longitude BETWEEN s.longitude - $3 AND s.longitude + $3
         AND (6371 * acos(
           LEAST(1.0, GREATEST(-1.0,
             cos(radians(s.latitude)) * cos(radians(a.latitude)) * cos(radians(a.longitude) - radians(s.longitude))
             + sin(radians(s.latitude)) * sin(radians(a.latitude))
           ))
         )) <= $4
        ) as nearby_count
      FROM schools s
      WHERE s.latitude IS NOT NULL
      AND s.longitude IS NOT NULL
      AND s.address LIKE $1
      ORDER BY s.school_nm`,
      `${sido}%`,
      latDelta,
      lngDelta,
      radius
    );

    // 결과 변환
    const result = schools.map((s) => {
      const nearbyCount = Number(s.nearby_count);
      return {
        id: s.id,
        name: s.school_nm,
        kind: s.school_kind || '기타',
        lat: s.latitude,
        lng: s.longitude,
        address: s.address || '',
        nearbyCount,
        accessLevel: getAccessLevel(nearbyCount),
      };
    });

    // 요약 통계
    const total = result.length;
    const blindSpots = result.filter((s) => s.nearbyCount < 5).length;
    const insufficient = result.filter((s) => s.nearbyCount >= 5 && s.nearbyCount < 10).length;
    const moderate = result.filter((s) => s.nearbyCount >= 10 && s.nearbyCount < 20).length;
    const sufficient = result.filter((s) => s.nearbyCount >= 20).length;
    const average = total > 0 ? result.reduce((sum, s) => sum + s.nearbyCount, 0) / total : 0;

    // 분포 계산
    const distribution = DISTRIBUTION_RANGES.map((range) => {
      const count = result.filter(
        (s) => s.nearbyCount >= range.min && s.nearbyCount <= range.max
      ).length;
      return { range: range.range, count, label: range.label };
    });

    return NextResponse.json({
      schools: result,
      summary: {
        total,
        blindSpots,
        insufficient,
        moderate,
        sufficient,
        average: Math.round(average * 10) / 10,
      },
      distribution,
      meta: { sido, radius },
    });
  } catch (error) {
    console.error('접근성 분석 API 오류:', error);
    return NextResponse.json(
      { error: '접근성 데이터 분석 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

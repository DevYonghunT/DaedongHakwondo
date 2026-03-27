import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRealmGroup } from '@/lib/constants';

/**
 * GET /api/districts/stats
 * 전국 통계 또는 특정 시도의 시군구 목록 조회
 *
 * Query Params:
 * - sido: 시도명 (선택)
 * - type: "sigungu_list" | undefined
 *   - sigungu_list: 해당 시도의 시군구 목록 반환
 *   - 없음: 전국 통계 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sido = searchParams.get('sido');
    const type = searchParams.get('type');

    // 시군구 목록 조회
    if (type === 'sigungu_list' && sido) {
      return await getSigunguList(sido);
    }

    // 전국 통계 조회
    return await getNationalStats();
  } catch (error) {
    console.error('통계 API 오류:', error);
    return NextResponse.json(
      { error: '통계 데이터 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 특정 시도의 시군구 목록 조회
 */
async function getSigunguList(sido: string) {
  // district_stats에서 해당 시도의 고유 시군구 목록 추출
  const districts = await prisma.districtStats.findMany({
    where: { sido },
    select: { sigungu: true },
    distinct: ['sigungu'],
    orderBy: { sigungu: 'asc' },
  });

  const sigunguList = districts.map((d) => d.sigungu).filter(Boolean);

  return NextResponse.json({ sigunguList });
}

/**
 * 전국 통계 조회
 */
async function getNationalStats() {
  // 전체 학원/학교 수 (병렬 조회)
  const [totalAcademies, totalSchools, bySidoRaw, byRealmRaw, topDenseRaw] =
    await Promise.all([
      // 전체 학원 수
      prisma.academy.count(),

      // 전체 학교 수
      prisma.school.count(),

      // 시도별 학원 수
      prisma.districtStats.groupBy({
        by: ['sido'],
        _sum: { academyCount: true },
        orderBy: { _sum: { academyCount: 'desc' } },
      }),

      // 분야별 학원 수
      prisma.districtStats.groupBy({
        by: ['realm'],
        _sum: { academyCount: true },
        orderBy: { _sum: { academyCount: 'desc' } },
      }),

      // Top 10 밀집 시군구
      prisma.districtStats.groupBy({
        by: ['sido', 'sigungu'],
        _sum: { academyCount: true },
        orderBy: { _sum: { academyCount: 'desc' } },
        take: 10,
      }),
    ]);

  // 데이터 포매팅
  const bySido = bySidoRaw
    .filter((item) => item.sido)
    .map((item) => ({
      sido: item.sido,
      count: item._sum.academyCount || 0,
    }));

  // 분야를 그룹 기준으로 통합 (예능(대)+기예(대)→예체능)
  const realmGrouped: Record<string, number> = {};
  byRealmRaw
    .filter((item) => item.realm)
    .forEach((item) => {
      const group = getRealmGroup(item.realm!);
      realmGrouped[group] = (realmGrouped[group] || 0) + (item._sum.academyCount || 0);
    });
  const byRealm = Object.entries(realmGrouped)
    .map(([realm, count]) => ({ realm, count }))
    .sort((a, b) => b.count - a.count);

  const topDense = topDenseRaw
    .filter((item) => item.sido && item.sigungu)
    .map((item) => ({
      sido: item.sido,
      sigungu: item.sigungu,
      count: item._sum.academyCount || 0,
    }));

  return NextResponse.json({
    totalAcademies,
    totalSchools,
    bySido,
    byRealm,
    topDense,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { getDbRealmsForGroup } from '@/lib/constants';

/**
 * GET /api/academies
 * 지도 바운드 내 학원 목록 조회
 *
 * Query Params:
 * - swLat: 남서 위도
 * - swLng: 남서 경도
 * - neLat: 북동 위도
 * - neLng: 북동 경도
 * - realm: 분야 필터 (콤마 구분, 선택)
 * - limit: 최대 반환 수 (기본 500)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 바운드 파라미터 파싱
    const swLat = parseFloat(searchParams.get('swLat') || '');
    const swLng = parseFloat(searchParams.get('swLng') || '');
    const neLat = parseFloat(searchParams.get('neLat') || '');
    const neLng = parseFloat(searchParams.get('neLng') || '');
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 10000);

    // 파라미터 유효성 검사
    if (isNaN(swLat) || isNaN(swLng) || isNaN(neLat) || isNaN(neLng)) {
      return NextResponse.json(
        { error: '유효한 좌표 파라미터가 필요합니다 (swLat, swLng, neLat, neLng)' },
        { status: 400 }
      );
    }

    // 분야 필터
    const realmParam = searchParams.get('realm');
    const realmFilter = realmParam
      ? realmParam.split(',').map((r) => r.trim()).filter(Boolean)
      : null;

    // Prisma 쿼리 조건
    const where: Record<string, unknown> = {
      latitude: {
        gte: swLat,
        lte: neLat,
      },
      longitude: {
        gte: swLng,
        lte: neLng,
      },
      // 위도/경도가 null이 아닌 것만
      NOT: [
        { latitude: null },
        { longitude: null },
      ],
    };

    // 분야 필터 적용 (그룹명 → DB 원본명으로 변환)
    if (realmFilter && realmFilter.length > 0) {
      const dbRealms = realmFilter.flatMap((group) => getDbRealmsForGroup(group));
      if (dbRealms.length > 0) {
        where.realmScNm = { in: dbRealms };
      }
    }

    // 학원 조회 (마커용, LIMIT 적용)
    const academies = await prisma.academy.findMany({
      where,
      select: {
        id: true,
        academyNm: true,
        realmScNm: true,
        leOrdNm: true,
        leCrseNm: true,
        latitude: true,
        longitude: true,
        address: true,
        tuitionFee: true,
        capacity: true,
        academyType: true,
      },
      take: limit,
    });

    // 정확한 통계 조회 (LIMIT 없이 전체 바운드 대상)
    const realms = realmFilter ?? [];
    const statsQuery = await prisma.$queryRaw<Array<{ realm_sc_nm: string | null; count: bigint }>>(
      realmFilter && realmFilter.length > 0
        ? Prisma.sql`SELECT realm_sc_nm, COUNT(*) as count FROM academies
            WHERE latitude BETWEEN ${swLat} AND ${neLat}
            AND longitude BETWEEN ${swLng} AND ${neLng}
            AND latitude IS NOT NULL AND longitude IS NOT NULL
            AND realm_sc_nm IN (${Prisma.join(realms)})
            GROUP BY realm_sc_nm`
        : Prisma.sql`SELECT realm_sc_nm, COUNT(*) as count FROM academies
            WHERE latitude BETWEEN ${swLat} AND ${neLat}
            AND longitude BETWEEN ${swLng} AND ${neLng}
            AND latitude IS NOT NULL AND longitude IS NOT NULL
            GROUP BY realm_sc_nm`
    );

    const statsBreakdown = statsQuery.map((row) => ({
      realm: row.realm_sc_nm || '기타',
      count: Number(row.count),
    }));
    const statsTotal = statsBreakdown.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      academies,
      count: academies.length,
      bounds: { swLat, swLng, neLat, neLng },
      stats: {
        total: statsTotal,
        breakdown: statsBreakdown.map((b) => ({
          ...b,
          ratio: statsTotal > 0 ? b.count / statsTotal : 0,
        })),
      },
    });
  } catch (error) {
    console.error('학원 조회 API 오류:', error);
    return NextResponse.json(
      { error: '학원 데이터 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // 분야 필터 적용
    if (realmFilter && realmFilter.length > 0) {
      where.realmScNm = { in: realmFilter };
    }

    // 학원 조회
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

    return NextResponse.json({
      academies,
      count: academies.length,
      bounds: { swLat, swLng, neLat, neLng },
    });
  } catch (error) {
    console.error('학원 조회 API 오류:', error);
    return NextResponse.json(
      { error: '학원 데이터 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

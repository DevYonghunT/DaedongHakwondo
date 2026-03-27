import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRealmGroup } from '@/lib/constants';

/**
 * GET /api/districts/compare
 * 두 지역의 학원 통계 비교
 *
 * Query Params:
 * - region1: "시도-시군구" 형식 (예: "서울특별시-강남구")
 * - region2: "시도-시군구" 형식 (예: "경기도-수원시")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region1Param = searchParams.get('region1');
    const region2Param = searchParams.get('region2');

    if (!region1Param || !region2Param) {
      return NextResponse.json(
        { error: '두 지역 파라미터가 필요합니다 (region1, region2)' },
        { status: 400 }
      );
    }

    // 지역 파싱
    const [sido1, sigungu1] = region1Param.split('-');
    const [sido2, sigungu2] = region2Param.split('-');

    if (!sido1 || !sigungu1 || !sido2 || !sigungu2) {
      return NextResponse.json(
        { error: '지역 형식이 올바르지 않습니다. "시도-시군구" 형식을 사용하세요.' },
        { status: 400 }
      );
    }

    // 두 지역의 통계 병렬 조회
    const [stats1, stats2] = await Promise.all([
      getDistrictStats(sido1, sigungu1),
      getDistrictStats(sido2, sigungu2),
    ]);

    return NextResponse.json({
      region1: stats1,
      region2: stats2,
    });
  } catch (error) {
    console.error('지역 비교 API 오류:', error);
    return NextResponse.json(
      { error: '지역 비교 데이터 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 특정 시도-시군구의 학원 통계 조회
 */
async function getDistrictStats(sido: string, sigungu: string) {
  // district_stats 테이블에서 조회
  const districtData = await prisma.districtStats.findMany({
    where: {
      sido,
      sigungu,
    },
    select: {
      realm: true,
      academyCount: true,
      avgTuition: true,
      totalCapacity: true,
    },
  });

  // 분야별 집계
  const realmMap: Record<string, { count: number; tuition: number; tuitionEntries: number }> = {};
  let total = 0;
  let totalTuition = 0;
  let tuitionEntries = 0;
  let totalCapacity = 0;

  districtData.forEach((d) => {
    const realm = getRealmGroup(d.realm || '기타');
    if (!realmMap[realm]) {
      realmMap[realm] = { count: 0, tuition: 0, tuitionEntries: 0 };
    }
    realmMap[realm].count += d.academyCount;
    total += d.academyCount;

    if (d.avgTuition && d.avgTuition > 0) {
      realmMap[realm].tuition += d.avgTuition * d.academyCount;
      realmMap[realm].tuitionEntries += d.academyCount;
      totalTuition += d.avgTuition * d.academyCount;
      tuitionEntries += d.academyCount;
    }

    if (d.totalCapacity) {
      totalCapacity += d.totalCapacity;
    }
  });

  const byRealm = Object.entries(realmMap).map(([realm, data]) => ({
    realm,
    count: data.count,
    ratio: total > 0 ? data.count / total : 0,
  }));

  return {
    sido,
    sigungu,
    total,
    avgTuition: tuitionEntries > 0 ? Math.round(totalTuition / tuitionEntries) : null,
    totalCapacity: totalCapacity || null,
    byRealm,
  };
}

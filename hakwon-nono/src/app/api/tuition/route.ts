import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 수강료 통계 API
 * GET /api/tuition?groupBy=sido|sigungu&sido=서울특별시
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'sido';
    const sido = searchParams.get('sido');

    // 지역별 + 분야별 수강료 통계
    let regionExpr: string;
    if (groupBy === 'sigungu' && sido) {
      // 시군구 단위: 주소에서 두 번째 단어까지 추출
      regionExpr = `SUBSTRING(address FROM '^[^ ]+ [^ ]+')`;
    } else {
      // 시도 단위: 주소에서 첫 번째 단어 추출
      regionExpr = `SUBSTRING(address FROM '^[^ ]+')`;
    }

    // sido 필터 조건
    const whereClause = sido
      ? `AND address LIKE '${sido.replace(/'/g, "''")}%'`
      : '';

    const stats = await prisma.$queryRawUnsafe<
      Array<{
        region: string;
        realm: string;
        count: bigint;
        avg_tuition: number;
        min_tuition: number;
        max_tuition: number;
      }>
    >(`
      SELECT
        ${regionExpr} AS region,
        realm_sc_nm AS realm,
        COUNT(*) AS count,
        ROUND(AVG(tuition_fee)) AS avg_tuition,
        MIN(tuition_fee) AS min_tuition,
        MAX(tuition_fee) AS max_tuition
      FROM academies
      WHERE tuition_fee > 0
        AND address IS NOT NULL
        AND realm_sc_nm IS NOT NULL
        ${whereClause}
      GROUP BY region, realm_sc_nm
      HAVING COUNT(*) >= 3
      ORDER BY region, realm_sc_nm
    `);

    // 전국 평균 및 총 건수
    const nationalStats = await prisma.$queryRawUnsafe<
      Array<{
        avg_tuition: number;
        total_count: bigint;
      }>
    >(`
      SELECT
        ROUND(AVG(tuition_fee)) AS avg_tuition,
        COUNT(*) AS total_count
      FROM academies
      WHERE tuition_fee > 0
    `);

    const nationalAvg = nationalStats[0]?.avg_tuition || 0;
    const totalWithTuition = Number(nationalStats[0]?.total_count || 0);

    // bigint를 number로 변환
    const formattedStats = stats
      .filter((s) => s.region != null)
      .map((s) => ({
        region: s.region,
        realm: s.realm,
        count: Number(s.count),
        avgTuition: Number(s.avg_tuition),
        minTuition: Number(s.min_tuition),
        maxTuition: Number(s.max_tuition),
      }));

    return NextResponse.json({
      stats: formattedStats,
      nationalAvg: Number(nationalAvg),
      totalWithTuition,
    });
  } catch (error) {
    console.error('수강료 통계 API 오류:', error);
    return NextResponse.json(
      { error: '수강료 통계를 불러올 수 없습니다' },
      { status: 500 }
    );
  }
}

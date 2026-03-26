import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/correlation
 * 학원 밀집도 vs 교육 환경 상관관계 데이터
 * 시군구별 학원 수, 학교 수, 학원/학교 비율, 평균 수강료, 분야 다양성 반환
 */
export async function GET() {
  try {
    const districts: Array<{
      sigungu: string;
      academy_count: bigint;
      avg_tuition: number | null;
      realm_diversity: bigint;
      school_count: bigint;
      academy_per_school: number | null;
    }> = await prisma.$queryRaw(Prisma.sql`
      WITH academy_stats AS (
        SELECT
          SUBSTRING(address FROM '^(\S+\s+\S+)') as sigungu,
          COUNT(*) as academy_count,
          ROUND(AVG(CASE WHEN tuition_fee > 0 THEN tuition_fee END)) as avg_tuition,
          COUNT(DISTINCT realm_sc_nm) as realm_diversity
        FROM academies
        WHERE address IS NOT NULL
        GROUP BY sigungu
        HAVING COUNT(*) >= 10
      ),
      school_stats AS (
        SELECT
          SUBSTRING(address FROM '^(\S+\s+\S+)') as sigungu,
          COUNT(*) as school_count
        FROM schools
        WHERE address IS NOT NULL
        GROUP BY sigungu
      )
      SELECT
        a.sigungu,
        a.academy_count,
        COALESCE(s.school_count, 0) as school_count,
        CASE
          WHEN s.school_count > 0 THEN ROUND(a.academy_count::numeric / s.school_count, 1)
          ELSE 0
        END as academy_per_school,
        a.avg_tuition,
        a.realm_diversity
      FROM academy_stats a
      LEFT JOIN school_stats s ON a.sigungu = s.sigungu
      ORDER BY a.academy_count DESC
    `);

    // BigInt -> Number 변환 및 null 처리
    const serialized = districts.map((d) => ({
      sigungu: d.sigungu,
      academy_count: Number(d.academy_count),
      school_count: Number(d.school_count),
      academy_per_school: d.academy_per_school ? Number(d.academy_per_school) : 0,
      avg_tuition: d.avg_tuition ? Number(d.avg_tuition) : null,
      realm_diversity: Number(d.realm_diversity),
    }));

    // 인사이트 계산
    const totalDistricts = serialized.length;
    const avgAcademyPerSchool =
      totalDistricts > 0
        ? Math.round(
            (serialized.reduce((sum, d) => sum + d.academy_per_school, 0) / totalDistricts) * 10
          ) / 10
        : 0;

    // 수강료와 밀집도 간 상관관계 방향 판단
    const withTuition = serialized.filter((d) => d.avg_tuition !== null && d.avg_tuition > 0);
    let correlationTuitionDensity = 'neutral';
    if (withTuition.length >= 5) {
      const sorted = [...withTuition].sort((a, b) => b.academy_count - a.academy_count);
      const topHalf = sorted.slice(0, Math.floor(sorted.length / 2));
      const bottomHalf = sorted.slice(Math.floor(sorted.length / 2));
      const avgTuitionTop =
        topHalf.reduce((s, d) => s + (d.avg_tuition || 0), 0) / topHalf.length;
      const avgTuitionBottom =
        bottomHalf.reduce((s, d) => s + (d.avg_tuition || 0), 0) / bottomHalf.length;

      if (avgTuitionTop > avgTuitionBottom * 1.1) {
        correlationTuitionDensity = 'positive';
      } else if (avgTuitionBottom > avgTuitionTop * 1.1) {
        correlationTuitionDensity = 'negative';
      }
    }

    return NextResponse.json({
      districts: serialized,
      insights: {
        totalDistricts,
        avgAcademyPerSchool,
        correlationTuitionDensity,
      },
    });
  } catch (error) {
    console.error('상관관계 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '상관관계 데이터를 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

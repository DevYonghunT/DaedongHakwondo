import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAnthropicClient } from '@/lib/anthropic';
import { REGION_ANALYSIS_PROMPT } from '@/lib/prompts';
import { REPORT_CACHE_DAYS } from '@/lib/constants';

/**
 * POST /api/analysis/report
 * AI 분석 리포트 생성 (캐시 기반)
 *
 * Body:
 * - regionKey: 지역 식별자 (예: "서울특별시-강남구", "school-{id}-2km")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { regionKey } = body;

    if (!regionKey || typeof regionKey !== 'string') {
      return NextResponse.json(
        { error: 'regionKey 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    // 1. 캐시 확인
    const cached = await prisma.aiReport.findUnique({
      where: { regionKey },
    });

    // 캐시가 유효한 경우 바로 반환
    if (cached && new Date(cached.expiresAt) > new Date()) {
      return NextResponse.json({
        reportContent: cached.reportContent,
        cached: true,
        createdAt: cached.createdAt,
      });
    }

    // 2. 지역 데이터 조회
    const regionData = await getRegionData(regionKey);

    if (!regionData || regionData.total === 0) {
      return NextResponse.json(
        { error: '해당 지역의 데이터가 부족하여 분석할 수 없습니다' },
        { status: 404 }
      );
    }

    // 3. Claude API로 분석 요청
    const prompt = REGION_ANALYSIS_PROMPT(
      regionData.regionName,
      JSON.stringify(regionData.stats, null, 2)
    );

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    // JSON 파싱 시도
    let reportContent: string;
    try {
      // JSON 블록 추출 (코드블록 안에 있을 수 있음)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // 유효한 JSON인지 검증
        JSON.parse(jsonMatch[0]);
        reportContent = jsonMatch[0];
      } else {
        throw new Error('JSON 형식의 응답을 찾을 수 없습니다');
      }
    } catch {
      console.error('AI 응답 파싱 오류, 원본 텍스트 저장:', responseText.substring(0, 200));
      reportContent = JSON.stringify({
        summary: '분석 결과를 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.',
        realm_analysis: [],
        school_suggestions: [],
        parent_info: '',
        data_note: '데이터 분석 중 오류가 발생했습니다.',
      });
    }

    // 4. 캐시 저장 (upsert)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REPORT_CACHE_DAYS);

    await prisma.aiReport.upsert({
      where: { regionKey },
      update: {
        reportContent,
        dataSnapshot: regionData.stats as object,
        expiresAt,
      },
      create: {
        regionKey,
        reportContent,
        dataSnapshot: regionData.stats as object,
        expiresAt,
      },
    });

    return NextResponse.json({
      reportContent,
      cached: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('AI 리포트 생성 API 오류:', error);
    return NextResponse.json(
      { error: 'AI 리포트 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * regionKey에서 지역 데이터 추출
 */
async function getRegionData(regionKey: string): Promise<{
  regionName: string;
  total: number;
  stats: Record<string, unknown>;
} | null> {
  // 학교 주변 검색 키: "school-{id}-{radius}km"
  const schoolMatch = regionKey.match(/^school-(.+)-(\d+)km$/);

  if (schoolMatch) {
    const schoolId = schoolMatch[1];
    const radiusKm = parseInt(schoolMatch[2], 10);

    // 학교 정보 조회
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { schoolNm: true, latitude: true, longitude: true, address: true },
    });

    if (!school || !school.latitude || !school.longitude) return null;

    // 주변 학원 조회
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / 88.8;

    const academies = await prisma.academy.findMany({
      where: {
        latitude: { gte: school.latitude - latDelta, lte: school.latitude + latDelta },
        longitude: { gte: school.longitude - lngDelta, lte: school.longitude + lngDelta },
        NOT: [{ latitude: null }, { longitude: null }],
      },
      select: {
        realmScNm: true,
        tuitionFee: true,
        capacity: true,
      },
    });

    // 통계 계산
    const realmCounts: Record<string, number> = {};
    let totalTuition = 0;
    let tuitionCount = 0;

    academies.forEach((a) => {
      const realm = a.realmScNm || '기타';
      realmCounts[realm] = (realmCounts[realm] || 0) + 1;
      if (a.tuitionFee && a.tuitionFee > 0) {
        totalTuition += a.tuitionFee;
        tuitionCount++;
      }
    });

    const total = academies.length;

    return {
      regionName: `${school.schoolNm} 주변 ${radiusKm}km (${school.address || ''})`,
      total,
      stats: {
        totalAcademies: total,
        byRealm: Object.entries(realmCounts).map(([realm, count]) => ({
          realm,
          count,
          ratio: total > 0 ? Math.round((count / total) * 1000) / 1000 : 0,
        })),
        avgTuition: tuitionCount > 0 ? Math.round(totalTuition / tuitionCount) : null,
      },
    };
  }

  // 일반 지역 키: "시도-시군구"
  const [sido, sigungu] = regionKey.split('-');
  if (!sido) return null;

  const where: Record<string, string> = { sido };
  if (sigungu) where.sigungu = sigungu;

  const districtData = await prisma.districtStats.findMany({
    where,
    select: {
      realm: true,
      academyCount: true,
      avgTuition: true,
    },
  });

  if (districtData.length === 0) return null;

  const realmStats: Record<string, { count: number; tuition: number; tuitionEntries: number }> = {};
  let total = 0;

  districtData.forEach((d) => {
    const realm = d.realm || '기타';
    if (!realmStats[realm]) {
      realmStats[realm] = { count: 0, tuition: 0, tuitionEntries: 0 };
    }
    realmStats[realm].count += d.academyCount;
    total += d.academyCount;
    if (d.avgTuition && d.avgTuition > 0) {
      realmStats[realm].tuition += d.avgTuition * d.academyCount;
      realmStats[realm].tuitionEntries += d.academyCount;
    }
  });

  const regionName = sigungu ? `${sido} ${sigungu}` : sido;

  return {
    regionName,
    total,
    stats: {
      totalAcademies: total,
      byRealm: Object.entries(realmStats).map(([realm, data]) => ({
        realm,
        count: data.count,
        ratio: total > 0 ? Math.round((data.count / total) * 1000) / 1000 : 0,
        avgTuition: data.tuitionEntries > 0
          ? Math.round(data.tuition / data.tuitionEntries)
          : null,
      })),
    },
  };
}

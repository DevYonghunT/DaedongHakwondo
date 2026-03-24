import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAnthropicClient } from '@/lib/anthropic';

/**
 * POST /api/recommend
 * AI 기반 학원 추천 API
 *
 * Body:
 * - schoolId: 학교 ID
 * - budget: 월 예산 (만원 단위)
 * - interests: 관심 분야 배열 (realmScNm 값)
 * - radius: 검색 반경 (km)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schoolId, budget, interests, radius } = body;

    // 입력값 검증
    if (!schoolId || typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'schoolId 파라미터가 필요합니다' },
        { status: 400 }
      );
    }
    if (!budget || typeof budget !== 'number' || budget <= 0) {
      return NextResponse.json(
        { error: '유효한 예산(만원)을 입력해주세요' },
        { status: 400 }
      );
    }
    if (!Array.isArray(interests) || interests.length === 0) {
      return NextResponse.json(
        { error: '관심 분야를 1개 이상 선택해주세요' },
        { status: 400 }
      );
    }
    const radiusKm = typeof radius === 'number' && radius > 0 ? radius : 2;

    // 1. 학교 정보 조회
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        schoolNm: true,
        schoolKind: true,
        latitude: true,
        longitude: true,
        address: true,
      },
    });

    if (!school || !school.latitude || !school.longitude) {
      return NextResponse.json(
        { error: '학교 정보를 찾을 수 없거나 위치 정보가 없습니다' },
        { status: 404 }
      );
    }

    // 2. Haversine 근사를 사용한 주변 학원 검색
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / 88.8;

    const academies = await prisma.academy.findMany({
      where: {
        latitude: {
          gte: school.latitude - latDelta,
          lte: school.latitude + latDelta,
        },
        longitude: {
          gte: school.longitude - lngDelta,
          lte: school.longitude + lngDelta,
        },
        realmScNm: { in: interests },
        NOT: [{ latitude: null }, { longitude: null }],
      },
      select: {
        id: true,
        academyNm: true,
        realmScNm: true,
        leSubjectNm: true,
        tuitionFee: true,
        capacity: true,
        latitude: true,
        longitude: true,
      },
    });

    // Haversine 거리 계산 및 필터링
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversine = (
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number
    ): number => {
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
    };

    const nearbyAcademies = academies
      .map((a) => ({
        ...a,
        distance: haversine(
          school.latitude!,
          school.longitude!,
          a.latitude!,
          a.longitude!
        ),
      }))
      .filter((a) => a.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    if (nearbyAcademies.length === 0) {
      return NextResponse.json(
        {
          error: `반경 ${radiusKm}km 내에 선택한 분야의 학원이 없습니다. 반경을 넓히거나 다른 분야를 선택해주세요.`,
        },
        { status: 404 }
      );
    }

    // 3. Claude API로 추천 요청
    const academyList = nearbyAcademies
      .map(
        (a) =>
          `- ${a.academyNm} | 분야: ${a.realmScNm || '미분류'} | 과목: ${a.leSubjectNm || '미상'} | 수강료: ${a.tuitionFee ? `${(a.tuitionFee / 10000).toFixed(1)}만원` : '정보없음'} | 거리: ${a.distance < 1 ? `${Math.round(a.distance * 1000)}m` : `${a.distance.toFixed(1)}km`}`
      )
      .join('\n');

    const prompt = `당신은 학부모를 위한 사교육 상담 전문가입니다.

다음 조건에 맞는 최적의 학원 조합을 추천해주세요:

- 학교: ${school.schoolNm} (${school.schoolKind || '학교'})
- 월 예산: ${budget}만원
- 관심 분야: ${interests.join(', ')}
- 검색 반경: ${radiusKm}km

주변 학원 목록 (총 ${nearbyAcademies.length}개):
${academyList}

다음 형식으로 추천해주세요:
1. **추천 조합** (예산 내 최적 2~4개 학원)
2. **추천 이유** (각 학원 선택 근거)
3. **월 예상 비용** (총액)
4. **추가 조언** (학년별 고려사항 등)`;

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const recommendation = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('');

    // 4. 추천 학원 ID 목록 반환 (프론트에서 카드 표시용)
    const recommendedAcademies = nearbyAcademies.map((a) => ({
      id: a.id,
      name: a.academyNm,
      realm: a.realmScNm,
      subject: a.leSubjectNm,
      tuitionFee: a.tuitionFee,
      distance: a.distance,
    }));

    return NextResponse.json({
      recommendation,
      academies: recommendedAcademies,
      schoolName: school.schoolNm,
      total: nearbyAcademies.length,
    });
  } catch (error) {
    console.error('AI 추천 API 오류:', error);
    return NextResponse.json(
      { error: 'AI 추천 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

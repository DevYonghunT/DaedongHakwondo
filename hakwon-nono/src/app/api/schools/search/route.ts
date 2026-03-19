import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/schools/search
 * 학교 이름 검색 (자동완성용)
 *
 * Query Params:
 * - q: 검색어 (최소 2자)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    // 검색어 최소 길이 검사
    if (query.length < 2) {
      return NextResponse.json(
        { error: '검색어는 2자 이상이어야 합니다', schools: [] },
        { status: 400 }
      );
    }

    // 학교 검색 (LIKE 검색)
    const schools = await prisma.school.findMany({
      where: {
        schoolNm: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        schoolNm: true,
        schoolKind: true,
        address: true,
        latitude: true,
        longitude: true,
      },
      take: 20, // 최대 20개 결과
      orderBy: {
        schoolNm: 'asc',
      },
    });

    return NextResponse.json({ schools });
  } catch (error) {
    console.error('학교 검색 API 오류:', error);
    return NextResponse.json(
      { error: '학교 검색 중 오류가 발생했습니다', schools: [] },
      { status: 500 }
    );
  }
}

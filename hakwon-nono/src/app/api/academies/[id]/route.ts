import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/academies/[id]
 * 학원 상세 정보 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const academy = await prisma.academy.findUnique({
      where: { id },
    });

    if (!academy) {
      return NextResponse.json(
        { error: '학원을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // rawData에서 추가 정보 파싱
    const rawData = academy.rawData as Record<string, string> | null;
    const tuitionDetail = rawData?.PSNBY_THCC_CNTNT || null;
    const phoneNumber = rawData?.FA_TELNO || null;
    const zipCode = rawData?.FA_RDNZC || null;
    const addressDetail = rawData?.FA_RDNDA || null;
    const isBranch = rawData?.BRHS_ACA_YN || null;
    const totalCapacity = rawData?.TOFOR_SMTOT || null;
    const courseList = rawData?.LE_CRSE_LIST_NM || null;

    // 과목별 수강료 파싱 ("문법 영어:268000, 리딩:268000" 형식)
    let tuitionBreakdown: Array<{ subject: string; fee: number }> = [];
    if (tuitionDetail) {
      tuitionBreakdown = tuitionDetail
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean)
        .map((item: string) => {
          const parts = item.split(':');
          if (parts.length === 2) {
            return {
              subject: parts[0].trim(),
              fee: parseInt(parts[1].trim(), 10) || 0,
            };
          }
          return { subject: item, fee: 0 };
        });
    }

    return NextResponse.json({
      academy: {
        id: academy.id,
        academyNm: academy.academyNm,
        academyType: academy.academyType,
        realmScNm: academy.realmScNm,
        leOrdNm: academy.leOrdNm,
        leCrseNm: academy.leCrseNm,
        leSubjectNm: academy.leSubjectNm,
        capacity: academy.capacity,
        tuitionFee: academy.tuitionFee,
        address: academy.address,
        addressDetail,
        zipCode,
        phoneNumber,
        latitude: academy.latitude,
        longitude: academy.longitude,
        regStatus: academy.regStatus,
        establishedDate: academy.establishedDate,
        closedDate: academy.closedDate,
        atptOfcdcScNm: academy.atptOfcdcScNm,
        isBranch,
        totalCapacity: totalCapacity ? parseInt(totalCapacity, 10) : null,
        courseList,
        tuitionBreakdown,
      },
    });
  } catch (error) {
    console.error('학원 상세 조회 API 오류:', error);
    return NextResponse.json(
      { error: '학원 상세 정보 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

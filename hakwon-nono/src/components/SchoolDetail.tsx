'use client';

import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Lightbulb, X } from 'lucide-react';
import { getRealmColor, getRealmLabel } from '@/lib/constants';

/** 방과후 활동 추천 매핑 (분야별 권장 프로그램) */
const REALM_SUGGESTIONS: Record<string, string> = {
  '입시.검정 및 보습': '국어·영어·수학 보충학습, 기초학력 향상 프로그램',
  '예능(대)': '미술, 음악, 무용, 연극 등 예체능 프로그램',
  '외국어': '영어 회화, 중국어, 일본어 등 외국어 프로그램',
  '종합(대)': '종합 학습, 멘토링, 자기주도학습 프로그램',
  '직업기술': '직업체험, 기술교육, 진로탐색 프로그램',
  '독서실': '독서토론, 자기주도학습 공간 제공',
  '기타': '다양한 특기적성 프로그램',
  '정보': '코딩, SW교육, AI 교육, 로봇공학 프로그램',
  '사고력/교양': '토론, 논술, 사고력 향상 프로그램',
  '특수교육(대)': '특수교육 대상 학생 맞춤 프로그램',
};

/** 부족/풍부 판단 임계값 (3%) */


/** 학교 상세 API 응답 타입 */
interface SchoolDetailData {
  school: {
    id: string;
    name: string;
    kind: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    coedu: string | null;
    foundation: string | null;
    hsType: string | null;
    phone: string | null;
    homepage: string | null;
    foundingDate: string | null;
    fax: string | null;
  };
  meal: {
    date: string;
    menu: string[];
  } | null;
  schedule: Array<{
    date: string;
    event: string;
  }>;
  nearbyAcademies: {
    total: number;
    byRealm: Array<{
      realm: string;
      count: number;
    }>;
  };
}

/** nearby API 응답에서 분야별 데이터 */
interface NearbyRealmData {
  realm: string;
  count: number;
  avgCount: number;
  ratio: number;
  avgRatio: number;
}

/** nearby API 응답 타입 */
interface NearbyApiResponse {
  total: number;
  sido?: string;
  sidoSchoolCount?: number;
  byRealm: NearbyRealmData[];
  avgTuition: number | null;
}

/** 부족 분야 분석 결과 */
interface DeficientRealm {
  realm: string;
  label: string;
  count: number;
  avgCount: number;
  suggestion: string;
}

interface SchoolDetailProps {
  schoolId: string;
  onClose: () => void;
  embedded?: boolean;
}

export default function SchoolDetail({ schoolId, onClose, embedded }: SchoolDetailProps) {
  const [data, setData] = useState<SchoolDetailData | null>(null);
  const [nearbyData, setNearbyData] = useState<NearbyApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 학교 상세 정보와 nearby 데이터를 병렬로 요청
        const [detailRes, nearbyRes] = await Promise.all([
          fetch(`/api/schools/${schoolId}/detail`),
          fetch(`/api/schools/${schoolId}/nearby?radius=1`),
        ]);

        if (!detailRes.ok) throw new Error('조회 실패');
        const detailJson = await detailRes.json();
        setData(detailJson);

        // nearby 데이터는 실패해도 전체를 막지 않음
        if (nearbyRes.ok) {
          const nearbyJson: NearbyApiResponse = await nearbyRes.json();
          setNearbyData(nearbyJson);
        }
      } catch {
        setError('학교 정보를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [schoolId]);

  const school = data?.school;

  // 학교 유형별 색상
  const getKindColor = (kind: string | null) => {
    switch (kind) {
      case '초등학교': return 'bg-green-100 text-green-700';
      case '중학교': return 'bg-blue-100 text-blue-700';
      case '고등학교': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // 주변 학원 최대 카운트 (바 차트 비율 계산용)
  const maxCount = data?.nearbyAcademies?.byRealm?.length
    ? Math.max(...data.nearbyAcademies.byRealm.map((r) => r.count))
    : 1;

  // 일정 날짜 포맷: YYYY-MM-DD → M/DD
  const formatScheduleDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  };

  // 방과후 활동 추천 분석: 시/도 평균 개수보다 부족한 분야 도출
  const deficientRealms = findDeficientRealms(nearbyData?.byRealm ?? []);

  return (
    <div className={embedded ? "flex flex-col h-full" : "fixed top-14 right-0 bottom-8 w-full sm:w-[400px] z-[1100] flex flex-col bg-white shadow-2xl border-l border-gray-200 animate-slide-in-right"}>
      {/* 헤더 */}
      <div className="flex-shrink-0 px-5 py-4 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            {isLoading ? (
              <h2 className="text-lg font-bold text-white">불러오는 중...</h2>
            ) : school ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-2xl">🏫</span>
                  <h2 className="text-lg font-bold text-white leading-tight truncate">
                    {school.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {school.kind && (
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getKindColor(school.kind)}`}>
                      {school.kind}
                    </span>
                  )}
                  {school.foundation && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                      {school.foundation}
                    </span>
                  )}
                  {school.coedu && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-white/20 text-white">
                      {school.coedu}
                    </span>
                  )}
                  {school.hsType && (
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                      {school.hsType}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <h2 className="text-lg font-bold text-white">학교 정보</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-5 text-center text-red-500 text-sm">{error}</div>
        )}

        {data && school && !isLoading && (
          <div className="divide-y divide-gray-100">
            {/* 기본 정보 */}
            <Section title="기본 정보" icon="📍">
              {school.address && (
                <InfoRow label="주소" value={school.address} />
              )}
              {school.phone && (
                <InfoRow
                  label="전화"
                  value={
                    <a href={`tel:${school.phone}`} className="text-indigo-600 hover:underline">
                      {school.phone}
                    </a>
                  }
                />
              )}
              {school.fax && (
                <InfoRow label="팩스" value={school.fax} />
              )}
              {school.homepage && (
                <InfoRow
                  label="홈페이지"
                  value={
                    <a
                      href={school.homepage.startsWith('http') ? school.homepage : `http://${school.homepage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      홈페이지 바로가기
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  }
                />
              )}
              {school.foundingDate && (
                <InfoRow label="개교일" value={school.foundingDate} />
              )}
            </Section>

            {/* 주변 학원 현황 */}
            <Section title="반경 1km 내 학원 현황" icon="📊">
              {data.nearbyAcademies.total > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold text-gray-800">
                    총 <span className="text-indigo-600">{data.nearbyAcademies.total}</span>개
                  </p>
                  {data.nearbyAcademies.byRealm.map((item) => {
                    const label = getRealmLabel(item.realm);
                    const color = getRealmColor(item.realm);
                    const barWidth = Math.max(8, (item.count / maxCount) * 100);

                    return (
                      <div key={item.realm} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-20 flex-shrink-0 truncate">
                          {label}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: color,
                              minWidth: '32px',
                            }}
                          >
                            <span className="text-[10px] font-bold text-white">
                              {item.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">주변에 등록된 학원이 없습니다.</p>
              )}
            </Section>

            {/* 방과후 활동 추천 — 시/도 평균 개수 대비 부족 분야 */}
            {nearbyData && (
              <Section title={`방과후 활동 추천 (${nearbyData.sido || '전국'} 평균 대비)`} icon="🎯">
                {deficientRealms.length > 0 ? (
                  <div className="space-y-3">
                    {deficientRealms.map((item) => (
                      <div key={item.realm} className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-semibold text-amber-800">
                            {item.label} 분야 — 부족
                          </span>
                        </div>

                        {/* 개수 비교 */}
                        <div className="flex items-center gap-4 mb-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">이 학교 주변:</span>
                            <span className="font-bold text-amber-700">{item.count}개</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">{nearbyData.sido} 평균:</span>
                            <span className="font-bold text-gray-700">{item.avgCount}개</span>
                          </div>
                        </div>

                        {/* 비교 바 — 주변은 분야 색상, 평균은 회색 */}
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-10">주변</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                              <div
                                className="h-2.5 rounded-full transition-all"
                                style={{
                                  width: `${item.avgCount > 0 ? Math.min((item.count / item.avgCount) * 100, 100) : 0}%`,
                                  backgroundColor: getRealmColor(item.realm),
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-10">평균</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                              <div className="h-2.5 rounded-full bg-gray-400 transition-all" style={{ width: '100%' }} />
                            </div>
                          </div>
                        </div>

                        {/* 방과후 추천 */}
                        <div className="flex items-start gap-1.5 mt-2">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 leading-relaxed">
                            추천: {item.suggestion}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* 종합 메시지 */}
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-800 leading-relaxed">
                          이 학교 주변에는{' '}
                          <strong>{deficientRealms.map((r) => r.label).join(', ')}</strong>{' '}
                          분야 학원이 {nearbyData.sido} 평균보다 부족합니다.
                          해당 분야의 방과후 활동을 개설하면 학생들의 사교육 접근성
                          격차를 줄일 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-green-800 leading-relaxed">
                        이 학교 주변은 {nearbyData.sido} 평균 대비 학원이 충분합니다.
                      </p>
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* 오늘의 급식 */}
            <Section title="오늘의 급식" icon="🍽️">
              {data.meal ? (
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-xs text-indigo-500 mb-2">{data.meal.date}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.meal.menu.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2.5 py-1 bg-white text-sm text-gray-700 rounded-lg border border-indigo-100"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">급식 정보가 없습니다.</p>
              )}
            </Section>

            {/* 학사일정 */}
            <Section title="이번 주 학사일정" icon="📅">
              {data.schedule.length > 0 ? (
                <div className="space-y-2">
                  {data.schedule.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md flex-shrink-0">
                        {formatScheduleDate(item.date)}
                      </span>
                      <span className="text-sm text-gray-700">{item.event}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">이번 주 일정이 없습니다.</p>
              )}
            </Section>
          </div>
        )}
      </div>

      {/* 슬라이드인 애니메이션 */}
      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * 절대 개수 기준으로 시/도 평균보다 부족한 분야를 찾는다.
 * avgCount > count인 분야만 반환 (부족한 분야만)
 */
function findDeficientRealms(byRealm: NearbyRealmData[]): DeficientRealm[] {
  const results: DeficientRealm[] = [];

  for (const item of byRealm) {
    // 시/도 평균 개수보다 적으면 부족
    if (item.avgCount > item.count) {
      const label = getRealmLabel(item.realm);
      const suggestion = REALM_SUGGESTIONS[item.realm] || '다양한 특기적성 프로그램';
      results.push({
        realm: item.realm,
        label,
        count: item.count,
        avgCount: item.avgCount,
        suggestion,
      });
    }
  }

  // 부족 정도 내림차순 (평균 대비 차이가 큰 순)
  results.sort((a, b) => (b.avgCount - b.count) - (a.avgCount - a.count));
  return results;
}

/** 섹션 컴포넌트 */
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

/** 정보 행 컴포넌트 */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-400 w-16 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 flex-1">
        {value || '-'}
      </span>
    </div>
  );
}

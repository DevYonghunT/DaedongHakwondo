'use client';

import { useEffect, useState } from 'react';
import { REALM_COLORS, REALM_LABELS } from '@/lib/constants';

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

interface SchoolDetailProps {
  schoolId: string;
  onClose: () => void;
}

export default function SchoolDetail({ schoolId, onClose }: SchoolDetailProps) {
  const [data, setData] = useState<SchoolDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/schools/${schoolId}/detail`);
        if (!res.ok) throw new Error('조회 실패');
        const json = await res.json();
        setData(json);
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

  return (
    <div className="fixed top-14 right-0 bottom-8 w-full sm:w-[400px] z-[1100] flex flex-col bg-white shadow-2xl border-l border-gray-200 animate-slide-in-right">
      {/* 헤더 */}
      <div className="flex-shrink-0 px-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600">
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
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
                    const label = REALM_LABELS[item.realm] || item.realm;
                    const color = REALM_COLORS[item.realm] || '#6B7280';
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

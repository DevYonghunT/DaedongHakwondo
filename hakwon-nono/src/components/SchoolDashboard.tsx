'use client';

import { useState, useEffect, useCallback } from 'react';
import { RADIUS_OPTIONS } from '@/lib/constants';
import type { SchoolResult } from '@/components/SchoolSearch';
import RealmPieChart from '@/components/charts/RealmPieChart';
import RegionBarChart from '@/components/charts/RegionBarChart';
import AIReport from '@/components/AIReport';

/** 주변 학원 통계 */
interface NearbyStats {
  total: number;
  byRealm: Array<{
    realm: string;
    count: number;
    ratio: number;
    avgRatio: number;
  }>;
  avgTuition: number | null;
  academies: Array<{
    id: string;
    academyNm: string;
    realmScNm: string | null;
    distance: number;
  }>;
}

interface SchoolDashboardProps {
  school: SchoolResult;
  onClose: () => void;
  onRadiusChange?: (radius: number) => void;
}

export default function SchoolDashboard({
  school,
  onClose,
  onRadiusChange,
}: SchoolDashboardProps) {
  const [radius, setRadius] = useState(2);
  const [stats, setStats] = useState<NearbyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'ai'>('overview');

  // 주변 학원 데이터 조회
  const fetchNearbyStats = useCallback(async () => {
    if (!school.latitude || !school.longitude) {
      setError('학교 위치 정보가 없습니다');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/schools/${school.id}/nearby?radius=${radius}`
      );
      if (!res.ok) throw new Error('데이터 조회 실패');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('주변 학원 조회 오류:', err);
      setError('주변 학원 정보를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [school.id, school.latitude, school.longitude, radius]);

  useEffect(() => {
    fetchNearbyStats();
  }, [fetchNearbyStats]);

  // 반경 변경 핸들러
  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    onRadiusChange?.(newRadius);
  };

  // 학교 유형 라벨
  const getSchoolKindBadge = (kind: string | null) => {
    switch (kind) {
      case '초등학교': return { label: '초등학교', color: 'bg-green-100 text-green-700' };
      case '중학교': return { label: '중학교', color: 'bg-blue-100 text-blue-700' };
      case '고등학교': return { label: '고등학교', color: 'bg-purple-100 text-purple-700' };
      default: return { label: kind || '학교', color: 'bg-gray-100 text-gray-700' };
    }
  };

  const badge = getSchoolKindBadge(school.schoolKind);

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-30 flex flex-col overflow-hidden animate-slide-in-right">
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <h2 className="text-lg font-bold truncate">{school.schoolNm}</h2>
            {school.address && (
              <p className="text-sm text-blue-100 mt-1 truncate">{school.address}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-3 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 반경 선택 */}
        <div className="mt-4">
          <p className="text-xs text-blue-200 mb-2">탐색 반경</p>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => handleRadiusChange(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  radius === r
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex">
          {[
            { key: 'overview' as const, label: '개요' },
            { key: 'list' as const, label: '학원 목록' },
            { key: 'ai' as const, label: 'AI 분석' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">주변 학원 분석 중...</p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={fetchNearbyStats}
              className="mt-3 text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 정상 데이터 */}
        {stats && !isLoading && !error && (
          <>
            {/* 개요 탭 */}
            {activeTab === 'overview' && (
              <div className="p-5 space-y-6">
                {/* 요약 카드 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs text-blue-600 font-medium">반경 {radius}km 학원</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                      {stats.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-xs text-emerald-600 font-medium">평균 수강료</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {stats.avgTuition
                        ? `${Math.round(stats.avgTuition / 10000)}만`
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* 분야별 분포 (도넛 차트) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">분야별 분포</h3>
                  <RealmPieChart
                    data={stats.byRealm.map((r) => ({
                      realm: r.realm,
                      count: r.count,
                    }))}
                    height={260}
                  />
                </div>

                {/* 시도 평균 대비 비교 (바 차트) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">시도 평균 대비</h3>
                  <RegionBarChart
                    data={stats.byRealm.map((r) => ({
                      realm: r.realm,
                      ratio: r.ratio,
                      avgRatio: r.avgRatio,
                    }))}
                    height={250}
                  />
                </div>
              </div>
            )}

            {/* 학원 목록 탭 */}
            {activeTab === 'list' && (
              <div className="divide-y divide-gray-100">
                {stats.academies.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    반경 {radius}km 내 학원이 없습니다
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-3 bg-gray-50 text-xs text-gray-500">
                      총 {stats.academies.length}개 학원
                    </div>
                    {stats.academies.map((academy) => (
                      <div key={academy.id} className="px-5 py-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {academy.academyNm}
                            </p>
                            {academy.realmScNm && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {academy.realmScNm}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {academy.distance < 1
                              ? `${Math.round(academy.distance * 1000)}m`
                              : `${academy.distance.toFixed(1)}km`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* AI 분석 탭 */}
            {activeTab === 'ai' && (
              <div className="p-5">
                <AIReport
                  regionKey={`school-${school.id}-${radius}km`}
                  autoLoad={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getRealmColor, getRealmLabel } from '@/lib/constants';
import Header from '@/components/Header';

/** 수강료 통계 항목 */
interface TuitionStat {
  region: string;
  realm: string;
  count: number;
  avgTuition: number;
  minTuition: number;
  maxTuition: number;
}

/** API 응답 */
interface TuitionResponse {
  stats: TuitionStat[];
  nationalAvg: number;
  totalWithTuition: number;
}

// 금액 포맷 (만원 단위)
const formatCurrency = (value: number) => {
  if (value >= 10000) {
    return `${Math.round(value / 10000)}만원`;
  }
  return `${value.toLocaleString('ko-KR')}원`;
};

// 바 차트 툴팁
const TuitionTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload || !payload[0]) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-secondary-200">
      <p className="text-sm font-medium text-secondary-800">{label}</p>
      <p className="text-sm text-blue-600 font-bold">
        {Math.round(payload[0].value).toLocaleString('ko-KR')}원
      </p>
    </div>
  );
};

// 분야 차트 툴팁
const RealmTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { fullName: string } }>;
  label?: string;
}) => {
  if (!active || !payload || !payload[0]) return null;
  const name = payload[0].payload?.fullName || label;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-secondary-200">
      <p className="text-sm font-medium text-secondary-800">{name}</p>
      <p className="text-sm text-blue-600 font-bold">
        {Math.round(payload[0].value).toLocaleString('ko-KR')}원
      </p>
    </div>
  );
};

export default function TuitionPage() {
  const [data, setData] = useState<TuitionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/tuition?groupBy=sido');
        if (!res.ok) throw new Error('데이터 조회 실패');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('수강료 통계 조회 오류:', err);
        setError('수강료 통계 데이터를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 지역별 평균 수강료 집계
  const regionAvgData = useMemo(() => {
    if (!data) return [];
    const regionMap: Record<string, { totalTuition: number; totalCount: number }> = {};
    data.stats.forEach((s) => {
      if (!regionMap[s.region]) {
        regionMap[s.region] = { totalTuition: 0, totalCount: 0 };
      }
      regionMap[s.region].totalTuition += s.avgTuition * s.count;
      regionMap[s.region].totalCount += s.count;
    });
    return Object.entries(regionMap)
      .map(([region, v]) => ({
        region,
        avgTuition: Math.round(v.totalTuition / v.totalCount),
        count: v.totalCount,
      }))
      .sort((a, b) => b.avgTuition - a.avgTuition);
  }, [data]);

  // 분야별 평균 수강료 집계
  const realmAvgData = useMemo(() => {
    if (!data) return [];
    const realmMap: Record<string, { totalTuition: number; totalCount: number }> = {};
    data.stats.forEach((s) => {
      if (!realmMap[s.realm]) {
        realmMap[s.realm] = { totalTuition: 0, totalCount: 0 };
      }
      realmMap[s.realm].totalTuition += s.avgTuition * s.count;
      realmMap[s.realm].totalCount += s.count;
    });
    return Object.entries(realmMap)
      .map(([realm, v]) => ({
        realm,
        fullName: realm,
        label: getRealmLabel(realm),
        avgTuition: Math.round(v.totalTuition / v.totalCount),
        count: v.totalCount,
        color: getRealmColor(realm),
      }))
      .sort((a, b) => b.avgTuition - a.avgTuition);
  }, [data]);

  // 히트맵 데이터: 지역 x 분야
  const heatmapData = useMemo(() => {
    if (!data) return { regions: [] as string[], realms: [] as string[], matrix: {} as Record<string, Record<string, number>> };
    const regions = Array.from(new Set(data.stats.map((s) => s.region))).sort();
    const realms = Array.from(new Set(data.stats.map((s) => s.realm))).sort();
    const matrix: Record<string, Record<string, number>> = {};
    data.stats.forEach((s) => {
      if (!matrix[s.region]) matrix[s.region] = {};
      matrix[s.region][s.realm] = s.avgTuition;
    });
    return { regions, realms, matrix };
  }, [data]);

  // 히트맵 색상 계산
  const getHeatColor = (value: number | undefined, maxVal: number) => {
    if (!value || !maxVal) return 'bg-secondary-50';
    const intensity = value / maxVal;
    if (intensity > 0.8) return 'bg-red-200 text-red-900';
    if (intensity > 0.6) return 'bg-orange-200 text-orange-900';
    if (intensity > 0.4) return 'bg-yellow-100 text-yellow-900';
    if (intensity > 0.2) return 'bg-blue-100 text-blue-900';
    return 'bg-blue-50 text-blue-800';
  };

  // 히트맵 최대값
  const heatmapMax = useMemo(() => {
    if (!data) return 0;
    return Math.max(...data.stats.map((s) => s.avgTuition), 0);
  }, [data]);

  // 가장 비싼/저렴한 지역
  const mostExpensive = regionAvgData[0];
  const cheapest = regionAvgData[regionAvgData.length - 1];

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* 공통 헤더 */}
      <Header title="사교육비 물가 지수" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 페이지 타이틀 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-secondary-900">사교육비 물가 지수</h2>
          <p className="text-sm text-secondary-500 mt-1">
            전국 학원 수강료 데이터를 기반으로 지역별, 분야별 사교육비 현황을 분석합니다.
          </p>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-secondary-500">수강료 데이터 분석 중...</p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <p className="text-secondary-600">{error}</p>
          </div>
        )}

        {/* 대시보드 콘텐츠 */}
        {data && !isLoading && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Section 1: 빅 넘버 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 전국 평균 수강료 */}
              <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary-500">전국 평균 수강료</p>
                </div>
                <p className="text-3xl font-bold text-secondary-900">
                  {formatCurrency(data.nationalAvg)}
                </p>
              </div>

              {/* 가장 비싼 지역 */}
              <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary-500">가장 비싼 지역</p>
                </div>
                <p className="text-2xl font-bold text-secondary-900">{mostExpensive?.region || '-'}</p>
                <p className="text-sm text-red-600 mt-1">
                  {mostExpensive ? formatCurrency(mostExpensive.avgTuition) : '-'}
                </p>
              </div>

              {/* 가장 저렴한 지역 */}
              <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary-500">가장 저렴한 지역</p>
                </div>
                <p className="text-2xl font-bold text-secondary-900">{cheapest?.region || '-'}</p>
                <p className="text-sm text-emerald-600 mt-1">
                  {cheapest ? formatCurrency(cheapest.avgTuition) : '-'}
                </p>
              </div>

              {/* 데이터 건수 */}
              <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary-500">수강료 데이터 건수</p>
                </div>
                <p className="text-3xl font-bold text-secondary-900">
                  {data.totalWithTuition.toLocaleString('ko-KR')}
                </p>
              </div>
            </div>

            {/* Section 2: 지역별 평균 수강료 바 차트 */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
              <h3 className="text-lg font-bold text-secondary-800 mb-2">지역별 평균 수강료</h3>
              <p className="text-sm text-secondary-500 mb-4">
                전국 평균({formatCurrency(data.nationalAvg)}) 대비{' '}
                <span className="text-red-500 font-medium">높은 지역</span>과{' '}
                <span className="text-blue-500 font-medium">낮은 지역</span>
              </p>
              <ResponsiveContainer width="100%" height={Math.max(400, regionAvgData.length * 32)}>
                <BarChart
                  data={regionAvgData}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 90, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="region"
                    tick={{ fontSize: 12, fill: '#4B5563' }}
                    axisLine={false}
                    tickLine={false}
                    width={85}
                  />
                  <Tooltip content={<TuitionTooltip />} />
                  <Bar dataKey="avgTuition" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {regionAvgData.map((item, index) => (
                      <Cell
                        key={index}
                        fill={item.avgTuition > data.nationalAvg ? '#EF4444' : '#3B82F6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Section 3: 분야별 평균 수강료 비교 */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
              <h3 className="text-lg font-bold text-secondary-800 mb-4">분야별 평균 수강료 비교</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={realmAvgData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#4B5563' }}
                    axisLine={false}
                    tickLine={false}
                    angle={-35}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<RealmTooltip />} />
                  <Bar dataKey="avgTuition" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {realmAvgData.map((item, index) => (
                      <Cell key={index} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Section 4: 지역 x 분야 히트맵 테이블 */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
              <h3 className="text-lg font-bold text-secondary-800 mb-2">지역 x 분야 히트맵</h3>
              <p className="text-sm text-secondary-500 mb-4">
                지역과 분야별 평균 수강료 현황 (단위: 원)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-secondary-500 sticky left-0 bg-white z-10 min-w-[100px]">
                        지역
                      </th>
                      {heatmapData.realms.map((realm) => (
                        <th
                          key={realm}
                          className="text-center py-3 px-2 text-xs font-semibold text-secondary-500 min-w-[80px]"
                        >
                          {getRealmLabel(realm)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {heatmapData.regions.map((region) => (
                      <tr key={region} className="hover:bg-secondary-50/50">
                        <td className="py-2.5 px-3 font-medium text-secondary-700 sticky left-0 bg-white z-10">
                          {region}
                        </td>
                        {heatmapData.realms.map((realm) => {
                          const value = heatmapData.matrix[region]?.[realm];
                          return (
                            <td
                              key={`${region}-${realm}`}
                              className={`py-2.5 px-2 text-center font-medium ${getHeatColor(value, heatmapMax)}`}
                            >
                              {value ? value.toLocaleString('ko-KR') : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 범례 */}
              <div className="mt-4 flex items-center gap-2 text-xs text-secondary-500">
                <span>낮음</span>
                <div className="flex">
                  <div className="w-8 h-4 bg-blue-50" />
                  <div className="w-8 h-4 bg-blue-100" />
                  <div className="w-8 h-4 bg-yellow-100" />
                  <div className="w-8 h-4 bg-orange-200" />
                  <div className="w-8 h-4 bg-red-200" />
                </div>
                <span>높음</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <footer className="mt-8 py-6 bg-white border-t border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-secondary-400">
            교육 공공데이터 활용 | 나이스 교육정보 개방포털 | 제8회 교육 공공데이터 AI활용대회 출품작
          </p>
        </div>
      </footer>
    </div>
  );
}

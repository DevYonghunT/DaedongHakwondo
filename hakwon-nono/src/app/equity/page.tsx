'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { OFFICE_CODE_TO_SIDO } from '@/lib/constants';
import Header from '@/components/Header';

// 시도 목록
const SIDO_LIST = Object.values(OFFICE_CODE_TO_SIDO);

// 반경 옵션
const RADIUS_OPTIONS = [1, 2, 3];

// 접근성 등급 색상
const ACCESS_LEVEL_COLORS: Record<string, string> = {
  '사각지대': '#EF4444',
  '부족': '#F97316',
  '보통': '#EAB308',
  '충분': '#22C55E',
  '매우 충분': '#16A34A',
};

// 접근성 등급 배지 스타일
const ACCESS_LEVEL_BADGE: Record<string, string> = {
  '사각지대': 'bg-red-100 text-red-700',
  '부족': 'bg-orange-100 text-orange-700',
  '보통': 'bg-yellow-100 text-yellow-700',
  '충분': 'bg-green-100 text-green-700',
  '매우 충분': 'bg-emerald-100 text-emerald-700',
};

// 데이터 타입
interface SchoolData {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  address: string;
  nearbyCount: number;
  accessLevel: string;
}

interface DistributionItem {
  range: string;
  count: number;
  label: string;
}

interface EquityData {
  schools: SchoolData[];
  summary: {
    total: number;
    blindSpots: number;
    insufficient: number;
    moderate: number;
    sufficient: number;
    average: number;
  };
  distribution: DistributionItem[];
  meta: { sido: string; radius: number };
}

// 커스텀 툴팁
const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: DistributionItem }>;
  label?: string;
}) => {
  if (!active || !payload || !payload[0]) return null;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-secondary-200">
      <p className="text-sm font-medium text-secondary-800">{label}</p>
      <p className="text-sm text-accent-600 font-bold">
        {payload[0].value.toLocaleString('ko-KR')}개 학교
      </p>
    </div>
  );
};

export default function EquityPage() {
  const [sido, setSido] = useState('서울특별시');
  const [radius, setRadius] = useState(1);
  const [data, setData] = useState<EquityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 데이터 조회
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/equity?sido=${encodeURIComponent(sido)}&radius=${radius}`
      );
      if (!res.ok) throw new Error('데이터 조회 실패');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('접근성 데이터 조회 오류:', err);
      setError('접근성 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, [sido, radius]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 사각지대 + 부족 학교 목록 (nearbyCount < 10, 오름차순)
  const blindSpotSchools = data
    ? data.schools
        .filter((s) => s.nearbyCount < 10)
        .sort((a, b) => a.nearbyCount - b.nearbyCount)
    : [];

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* 공통 헤더 */}
      <Header title="접근성 격차 분석" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 제목 + 설명 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-secondary-900 mb-2">
            사교육 접근성 격차 분석
          </h2>
          <p className="text-sm text-secondary-500 max-w-2xl">
            각 학교 주변 반경 내 학원 수를 기준으로 사교육 접근성 지수를 산출합니다.
            주변 학원이 적은 학교는 &quot;사각지대&quot;로 분류되어 교육 형평성 개선이 필요한 지역을 파악할 수 있습니다.
          </p>
        </div>

        {/* 컨트롤 패널 */}
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* 시도 선택 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-secondary-700">시도 선택</label>
              <select
                value={sido}
                onChange={(e) => setSido(e.target.value)}
                className="px-3 py-2 border border-secondary-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                {SIDO_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* 반경 선택 */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-secondary-700">분석 반경</label>
              <div className="flex gap-1">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                      radius === r
                        ? 'bg-primary-600 text-white'
                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                    }`}
                  >
                    {r}km
                  </button>
                ))}
              </div>
            </div>

            {/* 현재 상태 표시 */}
            {data && !isLoading && (
              <div className="ml-auto text-xs text-secondary-400">
                {data.meta.sido} / 반경 {data.meta.radius}km 기준
              </div>
            )}
          </div>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-secondary-500">
                {sido} 지역 접근성 분석 중...
              </p>
              <p className="text-xs text-secondary-400">
                학교별 주변 학원 수를 계산하고 있습니다. 잠시만 기다려주세요.
              </p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* 메인 콘텐츠 */}
        {data && !isLoading && (
          <div className="space-y-6 animate-fade-in-up">
            {/* 요약 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 분석 학교 수 */}
              <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary-500">분석 학교 수</p>
                </div>
                <p className="text-3xl font-bold text-secondary-900">
                  {data.summary.total.toLocaleString('ko-KR')}
                </p>
              </div>

              {/* 사각지대 학교 수 */}
              <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary-500">사각지대 학교</p>
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {data.summary.blindSpots.toLocaleString('ko-KR')}
                </p>
                <p className="text-xs text-secondary-400 mt-1">
                  반경 {radius}km 내 학원 5개 미만
                </p>
              </div>

              {/* 평균 접근 학원 수 */}
              <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary-500">평균 접근 학원 수</p>
                </div>
                <p className="text-3xl font-bold text-secondary-900">
                  {data.summary.average.toLocaleString('ko-KR')}
                </p>
                <p className="text-xs text-secondary-400 mt-1">
                  학교당 평균
                </p>
              </div>

              {/* 충분 비율 */}
              <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-secondary-500">접근성 충분 비율</p>
                </div>
                <p className="text-3xl font-bold text-secondary-900">
                  {data.summary.total > 0
                    ? ((data.summary.sufficient / data.summary.total) * 100).toFixed(1)
                    : 0}
                  <span className="text-lg text-secondary-500">%</span>
                </p>
                <p className="text-xs text-secondary-400 mt-1">
                  반경 {radius}km 내 학원 20개 이상
                </p>
              </div>
            </div>

            {/* 접근성 분포 차트 */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
              <h3 className="text-lg font-bold text-secondary-800 mb-1">접근성 분포</h3>
              <p className="text-xs text-secondary-400 mb-4">
                학교별 반경 {radius}km 내 학원 수 분포
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data.distribution}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickFormatter={(v: number) => v.toLocaleString('ko-KR')}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="range"
                    tick={{ fontSize: 12, fill: '#4B5563' }}
                    axisLine={false}
                    tickLine={false}
                    width={75}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
                    {data.distribution.map((item, index) => (
                      <Cell
                        key={index}
                        fill={ACCESS_LEVEL_COLORS[item.label] || '#6B7280'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* 범례 */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-secondary-100">
                {Object.entries(ACCESS_LEVEL_COLORS).map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-secondary-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 사각지대 학교 목록 */}
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-secondary-800">
                    사각지대 및 부족 학교 목록
                  </h3>
                  <p className="text-xs text-secondary-400 mt-1">
                    반경 {radius}km 내 학원 10개 미만 학교 ({blindSpotSchools.length.toLocaleString('ko-KR')}개)
                  </p>
                </div>
              </div>

              {blindSpotSchools.length === 0 ? (
                <div className="text-center py-12 text-secondary-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">사각지대 학교가 없습니다</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-secondary-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                          학교명
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                          학교종류
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider hidden md:table-cell">
                          주소
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                          반경 내 학원
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                          접근성 등급
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {blindSpotSchools.slice(0, 100).map((school) => (
                        <tr key={school.id} className="hover:bg-secondary-50">
                          <td className="py-3 px-4 text-sm font-medium text-secondary-800">
                            {school.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-secondary-600">
                            {school.kind}
                          </td>
                          <td className="py-3 px-4 text-sm text-secondary-500 hidden md:table-cell max-w-xs truncate">
                            {school.address}
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-secondary-900 text-right">
                            {school.nearbyCount.toLocaleString('ko-KR')}개
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                ACCESS_LEVEL_BADGE[school.accessLevel] || 'bg-secondary-100 text-secondary-600'
                              }`}
                            >
                              {school.accessLevel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {blindSpotSchools.length > 100 && (
                    <div className="text-center py-3 text-xs text-secondary-400 border-t border-secondary-100">
                      외 {(blindSpotSchools.length - 100).toLocaleString('ko-KR')}개 학교 (상위 100개만 표시)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 분석 인사이트 */}
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl border border-primary-200 p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-accent-900 mb-2">분석 요약</h4>
                  <div className="space-y-1.5 text-sm text-accent-800">
                    <p>
                      {sido} 지역 내 분석 대상 학교 {data.summary.total.toLocaleString('ko-KR')}개 중{' '}
                      <strong className="text-red-600">
                        {data.summary.blindSpots.toLocaleString('ko-KR')}개 학교
                        ({data.summary.total > 0
                          ? ((data.summary.blindSpots / data.summary.total) * 100).toFixed(1)
                          : 0}
                        %)
                      </strong>
                      가 반경 {radius}km 내 학원 5개 미만의 사각지대에 해당합니다.
                    </p>
                    <p>
                      학교당 평균 접근 가능 학원 수는{' '}
                      <strong>{data.summary.average.toLocaleString('ko-KR')}개</strong>이며,
                      접근성 충분(20개 이상) 학교는 전체의{' '}
                      <strong>
                        {data.summary.total > 0
                          ? ((data.summary.sufficient / data.summary.total) * 100).toFixed(1)
                          : 0}
                        %
                      </strong>
                      입니다.
                    </p>
                    {data.summary.blindSpots > 0 && (
                      <p className="text-accent-700 mt-2">
                        사각지대 학교가 위치한 지역은 공교육 보완 프로그램, 방과후학교 확충 등
                        교육 형평성 개선을 위한 정책적 관심이 필요합니다.
                      </p>
                    )}
                  </div>
                </div>
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

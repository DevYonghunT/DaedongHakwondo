'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';

/** 지역별 상관관계 데이터 */
interface DistrictData {
  sigungu: string;
  academy_count: number;
  school_count: number;
  academy_per_school: number;
  avg_tuition: number | null;
  realm_diversity: number;
}

interface CorrelationResponse {
  districts: DistrictData[];
  insights: {
    totalDistricts: number;
    avgAcademyPerSchool: number;
    correlationTuitionDensity: string;
  };
}

// 색상 팔레트
const BAR_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
  '#6366F1', '#14B8A6', '#F97316', '#EF4444', '#06B6D4',
  '#84CC16', '#D946EF', '#A855F7', '#0EA5E9', '#22C55E',
  '#E11D48', '#7C3AED', '#2DD4BF', '#FB923C', '#F43F5E',
];

// 바 차트 툴팁
const DensityTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { sigungu: string; academy_per_school: number } }>;
}) => {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-800">{d.sigungu}</p>
      <p className="text-sm text-blue-600 font-bold">학교당 {d.academy_per_school}개 학원</p>
    </div>
  );
};

// 산점도 툴팁
const ScatterTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: DistrictData }>;
}) => {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-800">{d.sigungu}</p>
      <p className="text-xs text-gray-500">학원 수: {d.academy_count.toLocaleString()}개</p>
      <p className="text-xs text-gray-500">
        평균 수강료: {d.avg_tuition ? `${d.avg_tuition.toLocaleString()}원` : '정보 없음'}
      </p>
    </div>
  );
};

// 다양성 바 차트 툴팁
const DiversityTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { sigungu: string; realm_diversity: number } }>;
}) => {
  if (!active || !payload || !payload[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-800">{d.sigungu}</p>
      <p className="text-sm text-violet-600 font-bold">{d.realm_diversity}개 분야</p>
    </div>
  );
};

export default function InsightsPage() {
  const [data, setData] = useState<CorrelationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/correlation');
        if (!res.ok) throw new Error('데이터 조회 실패');
        const json: CorrelationResponse = await res.json();
        setData(json);
      } catch (err) {
        console.error('인사이트 데이터 조회 오류:', err);
        setError('데이터를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // 계산된 통계
  const avgTuition =
    data && data.districts.length > 0
      ? Math.round(
          data.districts
            .filter((d) => d.avg_tuition !== null && d.avg_tuition > 0)
            .reduce((sum, d) => sum + (d.avg_tuition || 0), 0) /
            data.districts.filter((d) => d.avg_tuition !== null && d.avg_tuition > 0).length
        )
      : 0;

  const avgDiversity =
    data && data.districts.length > 0
      ? Math.round(
          (data.districts.reduce((sum, d) => sum + d.realm_diversity, 0) / data.districts.length) *
            10
        ) / 10
      : 0;

  // 밀집도 Top 20
  const densityTop20 = data
    ? [...data.districts]
        .sort((a, b) => b.academy_per_school - a.academy_per_school)
        .slice(0, 20)
        .reverse()
    : [];

  // 산점도 데이터 (수강료가 있는 지역만)
  const scatterData = data
    ? data.districts.filter((d) => d.avg_tuition !== null && d.avg_tuition > 0)
    : [];

  // 다양성 Top 10 / Bottom 10
  const diversitySorted = data
    ? [...data.districts].sort((a, b) => b.realm_diversity - a.realm_diversity)
    : [];
  const diversityTop10 = diversitySorted.slice(0, 10);
  const diversityBottom10 = diversitySorted.slice(-10).reverse();

  // AI 인사이트 텍스트 생성
  const generateInsights = () => {
    if (!data || data.districts.length === 0) return [];

    const insights: string[] = [];

    // 가장 밀집된 지역
    const mostDense = [...data.districts].sort(
      (a, b) => b.academy_per_school - a.academy_per_school
    )[0];
    if (mostDense) {
      insights.push(
        `학원이 가장 밀집된 지역은 ${mostDense.sigungu}로, 학교 1개당 학원 ${mostDense.academy_per_school}개가 있습니다.`
      );
    }

    // 수강료가 가장 높은 지역
    const highestTuition = [...data.districts]
      .filter((d) => d.avg_tuition !== null && d.avg_tuition > 0)
      .sort((a, b) => (b.avg_tuition || 0) - (a.avg_tuition || 0))[0];
    if (highestTuition && highestTuition.avg_tuition) {
      insights.push(
        `수강료가 가장 높은 지역은 ${highestTuition.sigungu}로, 월 평균 ${highestTuition.avg_tuition.toLocaleString()}원입니다.`
      );
    }

    // 다양성이 가장 낮은 지역
    const lowestDiversity = [...data.districts].sort(
      (a, b) => a.realm_diversity - b.realm_diversity
    )[0];
    if (lowestDiversity) {
      insights.push(
        `교육 다양성이 가장 낮은 지역은 ${lowestDiversity.sigungu}로, ${lowestDiversity.realm_diversity}개 분야만 운영됩니다.`
      );
    }

    // 상관관계 인사이트
    const corr = data.insights.correlationTuitionDensity;
    if (corr === 'positive') {
      insights.push(
        '학원 밀집도가 높은 지역일수록 평균 수강료가 높은 양의 상관관계가 관찰됩니다. 수요와 경쟁이 가격을 끌어올리는 것으로 보입니다.'
      );
    } else if (corr === 'negative') {
      insights.push(
        '학원 밀집도가 높은 지역에서 오히려 평균 수강료가 낮은 음의 상관관계가 관찰됩니다. 경쟁이 가격 하락을 유도하는 것으로 보입니다.'
      );
    } else {
      insights.push(
        '학원 밀집도와 수강료 사이에 뚜렷한 상관관계가 관찰되지 않습니다. 지역별 특성이 더 큰 영향을 미치는 것으로 보입니다.'
      );
    }

    // 학교당 학원 평균
    insights.push(
      `전국 평균으로 학교 1개당 약 ${data.insights.avgAcademyPerSchool}개의 학원이 운영되고 있습니다.`
    );

    return insights;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">대동학원도</span>
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-medium text-gray-600">사교육 데이터 인사이트</h1>

          <nav className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              지도
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              전국 현황
            </Link>
            <Link
              href="/compare"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              지역 비교
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">상관관계 데이터 분석 중...</p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {/* 메인 콘텐츠 */}
        {data && !isLoading && (
          <div className="space-y-8 animate-fade-in-up">
            {/* Section 1: Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">분석 지역 수</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {data.insights.totalDistricts.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">평균 학교당 학원 수</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {data.insights.avgAcademyPerSchool}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">전국 평균 수강료</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {avgTuition > 0 ? `${avgTuition.toLocaleString()}원` : '-'}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">분야 다양성 평균</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{avgDiversity}개</p>
              </div>
            </div>

            {/* Section 2: 학원 밀집도 순위 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-1">학원 밀집도 순위 (Top 20)</h3>
              <p className="text-sm text-gray-400 mb-4">학교 1개당 학원 수 기준</p>
              <ResponsiveContainer width="100%" height={560}>
                <BarChart
                  data={densityTop20}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="sigungu"
                    tick={{ fontSize: 12, fill: '#4B5563' }}
                    axisLine={false}
                    tickLine={false}
                    width={95}
                  />
                  <Tooltip content={<DensityTooltip />} />
                  <Bar dataKey="academy_per_school" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {densityTop20.map((_, index) => (
                      <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Section 3: 학원 수 vs 수강료 산점도 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-1">학원 수 vs 평균 수강료</h3>
              <p className="text-sm text-gray-400 mb-4">
                각 점은 하나의 시군구를 나타냅니다. 밀집도와 수강료의 관계를 확인하세요.
              </p>
              <ResponsiveContainer width="100%" height={450}>
                <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    type="number"
                    dataKey="academy_count"
                    name="학원 수"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => v.toLocaleString()}
                    label={{
                      value: '학원 수',
                      position: 'insideBottom',
                      offset: -10,
                      style: { fontSize: 12, fill: '#6B7280' },
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="avg_tuition"
                    name="평균 수강료"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}만`}
                    label={{
                      value: '평균 수강료',
                      angle: -90,
                      position: 'insideLeft',
                      offset: -5,
                      style: { fontSize: 12, fill: '#6B7280' },
                    }}
                  />
                  <Tooltip content={<ScatterTooltip />} />
                  <Scatter
                    data={scatterData}
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    strokeWidth={1}
                    stroke="#2563EB"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Section 4: 분야 다양성 분석 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 다양성 Top 10 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  교육 다양성 높은 지역 (Top 10)
                </h3>
                <p className="text-sm text-gray-400 mb-4">분야 수가 많은 지역</p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={diversityTop10}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="sigungu"
                      tick={{ fontSize: 11, fill: '#4B5563' }}
                      axisLine={false}
                      tickLine={false}
                      width={95}
                    />
                    <Tooltip content={<DiversityTooltip />} />
                    <Bar dataKey="realm_diversity" radius={[0, 6, 6, 0]} maxBarSize={20} fill="#8B5CF6">
                      {diversityTop10.map((_, index) => (
                        <Cell key={index} fill={`hsl(${260 + index * 8}, 60%, ${55 + index * 2}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 다양성 Bottom 10 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  교육 다양성 낮은 지역 (Bottom 10)
                </h3>
                <p className="text-sm text-gray-400 mb-4">분야 수가 적은 지역</p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={diversityBottom10}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="sigungu"
                      tick={{ fontSize: 11, fill: '#4B5563' }}
                      axisLine={false}
                      tickLine={false}
                      width={95}
                    />
                    <Tooltip content={<DiversityTooltip />} />
                    <Bar dataKey="realm_diversity" radius={[0, 6, 6, 0]} maxBarSize={20}>
                      {diversityBottom10.map((_, index) => (
                        <Cell key={index} fill={`hsl(${0 + index * 5}, 70%, ${55 + index * 2}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Section 5: AI 인사이트 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">AI 인사이트</h3>
                  <p className="text-sm text-gray-400">데이터 기반 분석 결과</p>
                </div>
              </div>
              <div className="space-y-3">
                {generateInsights().map((insight, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 푸터 */}
      <footer className="mt-8 py-6 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            교육 공공데이터 활용 | 나이스 교육정보 개방포털 | 제8회 교육 공공데이터 AI활용대회 출품작
          </p>
        </div>
      </footer>
    </div>
  );
}

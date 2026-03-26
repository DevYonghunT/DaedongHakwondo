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
} from 'recharts';
import RealmPieChart from '@/components/charts/RealmPieChart';

/** 전국 통계 데이터 */
interface NationalStats {
  totalAcademies: number;
  totalSchools: number;
  bySido: Array<{
    sido: string;
    count: number;
  }>;
  byRealm: Array<{
    realm: string;
    count: number;
  }>;
  topDense: Array<{
    sido: string;
    sigungu: string;
    count: number;
  }>;
}

// 시도별 색상 팔레트
const SIDO_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
  '#6366F1', '#14B8A6', '#F97316', '#EF4444', '#06B6D4',
  '#84CC16', '#D946EF', '#A855F7', '#0EA5E9', '#22C55E',
  '#E11D48', '#7C3AED',
];

// 커스텀 툴팁
const BarTooltip = ({
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
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <p className="text-sm text-blue-600 font-bold">{payload[0].value.toLocaleString()}개</p>
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState<NationalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 전국 통계 조회
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/districts/stats');
        if (!res.ok) throw new Error('통계 조회 실패');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('전국 통계 조회 오류:', err);
        setError('전국 통계 데이터를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

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
          <h1 className="text-sm font-medium text-gray-600">전국 현황 대시보드</h1>

          <nav className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              지도
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
              <p className="text-sm text-gray-500">전국 데이터 분석 중...</p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <p className="text-gray-600">{error}</p>
          </div>
        )}

        {/* 대시보드 콘텐츠 */}
        {stats && !isLoading && (
          <div className="space-y-8 animate-fade-in-up">
            {/* 빅 넘버 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">전국 학원 수</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalAcademies.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">전국 학교 수</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalSchools.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">분야 수</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.byRealm.length}
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">시도 수</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.bySido.length}
                </p>
              </div>
            </div>

            {/* 차트 행 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 시도별 학원 수 바 차트 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">시도별 학원 수</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={[...stats.bySido].sort((a, b) => b.count - a.count)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#9CA3AF' }}
                      tickFormatter={(v: number) => v.toLocaleString()}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="sido"
                      tick={{ fontSize: 12, fill: '#4B5563' }}
                      axisLine={false}
                      tickLine={false}
                      width={75}
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={24}>
                      {[...stats.bySido]
                        .sort((a, b) => b.count - a.count)
                        .map((_, index) => (
                          <Cell key={index} fill={SIDO_COLORS[index % SIDO_COLORS.length]} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 분야별 분포 도넛 차트 */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">분야별 분포</h3>
                <RealmPieChart
                  data={stats.byRealm}
                  height={400}
                  innerRadius={70}
                  outerRadius={130}
                />
              </div>
            </div>

            {/* Top 10 밀집 지역 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">학원 밀집도 Top 10 시군구</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        순위
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        시도
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        시군구
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        학원 수
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">
                        비율
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.topDense.map((item, index) => {
                      const maxCount = stats.topDense[0]?.count || 1;
                      const barWidth = (item.count / maxCount) * 100;

                      return (
                        <tr key={`${item.sido}-${item.sigungu}`} className="hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                index < 3
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{item.sido}</td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-800">
                            {item.sigungu}
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-gray-900 text-right">
                            {item.count.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                                <div
                                  className="h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

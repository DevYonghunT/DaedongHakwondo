'use client';

import { useState, useEffect, useRef } from 'react';
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
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Building2, GraduationCap, BarChart3, MapPin } from 'lucide-react';
import Header from '@/components/Header';
import RealmPieChart from '@/components/charts/RealmPieChart';
import { StatSkeleton } from '@/components/ui/Skeleton';
import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

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

/** 숫자 카운트업 애니메이션 컴포넌트 */
function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (latest) =>
    Math.round(latest).toLocaleString()
  );

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 1.2,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value, motionVal]);

  // rounded 값을 구독해서 DOM에 반영
  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) {
        ref.current.textContent = v;
      }
    });
    return unsubscribe;
  }, [rounded]);

  return <span ref={ref}>0</span>;
}

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
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-secondary-200">
      <p className="text-sm font-medium text-secondary-800">{label}</p>
      <p className="text-sm text-accent-600 font-bold">{payload[0].value.toLocaleString()}개</p>
    </div>
  );
};

/** stagger 페이드인 애니메이션 설정 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
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
    <div className="min-h-screen bg-secondary-50">
      {/* 공통 헤더 */}
      <Header title="전국 현황 대시보드" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 로딩 스켈레톤 */}
        {isLoading && (
          <div className="space-y-8">
            {/* 빅 넘버 스켈레톤 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatSkeleton key={i} />
              ))}
            </div>
            {/* 차트 스켈레톤 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-secondary-200 p-6">
                <Skeleton width="w-40" height="h-5" className="mb-4" />
                <Skeleton height="h-[400px]" />
              </div>
              <div className="bg-white rounded-2xl border border-secondary-200 p-6">
                <Skeleton width="w-40" height="h-5" className="mb-4" />
                <Skeleton height="h-[400px]" />
              </div>
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
        {stats && !isLoading && (
          <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* 빅 넘버 카드 — Card 컴포넌트 적용, stagger 페이드인 + 숫자 카운팅 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card padding="lg" variants={itemVariants}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-accent-600" />
                  </div>
                  <p className="text-sm text-secondary-500">전국 학원 수</p>
                </div>
                <p className="text-3xl font-bold text-secondary-900">
                  <AnimatedNumber value={stats.totalAcademies} />
                </p>
              </Card>

              <Card padding="lg" variants={itemVariants}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-success-100 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-success-600" />
                  </div>
                  <p className="text-sm text-secondary-500">전국 학교 수</p>
                </div>
                <p className="text-3xl font-bold text-secondary-900">
                  <AnimatedNumber value={stats.totalSchools} />
                </p>
              </Card>

              <Card padding="lg" variants={itemVariants}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-violet-600" />
                  </div>
                  <p className="text-sm text-secondary-500">분야 수</p>
                </div>
                <p className="text-3xl font-bold text-secondary-900">
                  <AnimatedNumber value={stats.byRealm.length} />
                </p>
              </Card>

              <Card padding="lg" variants={itemVariants}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-warning-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-warning-600" />
                  </div>
                  <p className="text-sm text-secondary-500">시도 수</p>
                </div>
                <p className="text-3xl font-bold text-secondary-900">
                  <AnimatedNumber value={stats.bySido.length} />
                </p>
              </Card>
            </div>

            {/* 차트 행 — Card 컴포넌트 적용, 페이드인 */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 시도별 학원 수 바 차트 */}
              <Card padding="lg">
                <h3 className="text-lg font-bold text-secondary-800 mb-4">시도별 학원 수</h3>
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
              </Card>

              {/* 분야별 분포 도넛 차트 */}
              <Card padding="lg">
                <h3 className="text-lg font-bold text-secondary-800 mb-4">분야별 분포</h3>
                <RealmPieChart
                  data={stats.byRealm}
                  height={400}
                  innerRadius={70}
                  outerRadius={130}
                />
              </Card>
            </motion.div>

            {/* Top 10 밀집 지역 — Card 컴포넌트 적용, 페이드인 */}
            <Card padding="lg" variants={itemVariants}>
              <h3 className="text-lg font-bold text-secondary-800 mb-4">학원 밀집도 Top 10 시군구</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-secondary-200">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                        순위
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                        시도
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                        시군구
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider">
                        학원 수
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-secondary-500 uppercase tracking-wider w-1/3">
                        비율
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {stats.topDense.map((item, index) => {
                      const maxCount = stats.topDense[0]?.count || 1;
                      const barWidth = (item.count / maxCount) * 100;

                      return (
                        <tr key={`${item.sido}-${item.sigungu}`} className="hover:bg-secondary-50">
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                index < 3
                                  ? 'bg-accent-100 text-accent-700'
                                  : 'bg-secondary-100 text-secondary-600'
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-secondary-600">{item.sido}</td>
                          <td className="py-3 px-4 text-sm font-medium text-secondary-800">
                            {item.sigungu}
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-secondary-900 text-right">
                            {item.count.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-secondary-100 rounded-full h-2.5">
                                <div
                                  className="h-2.5 rounded-full bg-gradient-to-r from-accent-400 to-accent-600 transition-all duration-500"
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
            </Card>
          </motion.div>
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

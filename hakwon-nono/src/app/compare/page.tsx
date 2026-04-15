'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Lightbulb } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import CommandSearch from '@/components/layout/CommandSearch';
import { useCmdK } from '@/lib/hooks/useCmdK';
import RealmPieChart from '@/components/charts/RealmPieChart';
import RegionBarChart from '@/components/charts/RegionBarChart';
import { getRealmColor } from '@/lib/constants';
import Skeleton, { CardSkeleton } from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

/** 시도 목록 */
const SIDO_LIST = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시',
  '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '충청북도', '충청남도',
  '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
];

/** 지역 비교 데이터 */
interface DistrictCompareData {
  sido: string;
  sigungu: string;
  total: number;
  avgTuition: number | null;
  totalCapacity: number | null;
  byRealm: Array<{
    realm: string;
    count: number;
    ratio: number;
  }>;
}

/** 비교 결과 페이드인 애니메이션 */
const resultContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const resultItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' as const },
  },
};

export default function ComparePage() {
  // 지역 1 상태
  const [sido1, setSido1] = useState('');
  const [sigunguList1, setSigunguList1] = useState<string[]>([]);
  const [sigungu1, setSigungu1] = useState('');

  // 지역 2 상태
  const [sido2, setSido2] = useState('');
  const [sigunguList2, setSigunguList2] = useState<string[]>([]);
  const [sigungu2, setSigungu2] = useState('');

  // 비교 데이터
  const [data1, setData1] = useState<DistrictCompareData | null>(null);
  const [data2, setData2] = useState<DistrictCompareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string>('');

  // Cmd+K
  const [cmdOpen, setCmdOpen] = useState(false);
  useCmdK(() => setCmdOpen(true));

  // 시군구 목록 조회
  const fetchSigunguList = useCallback(async (sido: string, setter: (list: string[]) => void) => {
    if (!sido) {
      setter([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/districts/stats?sido=${encodeURIComponent(sido)}&type=sigungu_list`
      );
      if (res.ok) {
        const data = await res.json();
        setter(data.sigunguList || []);
      }
    } catch (err) {
      console.error('시군구 목록 조회 오류:', err);
    }
  }, []);

  // 시도 변경 시 시군구 목록 로드
  useEffect(() => {
    setSigungu1('');
    fetchSigunguList(sido1, setSigunguList1);
  }, [sido1, fetchSigunguList]);

  useEffect(() => {
    setSigungu2('');
    fetchSigunguList(sido2, setSigunguList2);
  }, [sido2, fetchSigunguList]);

  // 비교 데이터 조회
  const handleCompare = async () => {
    if (!sido1 || !sigungu1 || !sido2 || !sigungu2) {
      setError('두 지역을 모두 선택해주세요');
      return;
    }

    setIsLoading(true);
    setError(null);
    setInsight('');

    try {
      const region1 = `${sido1}-${sigungu1}`;
      const region2 = `${sido2}-${sigungu2}`;

      const res = await fetch(
        `/api/districts/compare?region1=${encodeURIComponent(region1)}&region2=${encodeURIComponent(region2)}`
      );

      if (!res.ok) throw new Error('비교 데이터 조회 실패');

      const data = await res.json();
      setData1(data.region1);
      setData2(data.region2);

      // 간단한 인사이트 생성
      generateInsight(data.region1, data.region2);
    } catch (err) {
      console.error('지역 비교 오류:', err);
      setError('지역 비교 데이터를 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 자동 생성 인사이트
  const generateInsight = (r1: DistrictCompareData, r2: DistrictCompareData) => {
    const insights: string[] = [];

    // 전체 수 비교
    if (r1.total > r2.total) {
      insights.push(
        `${r1.sido} ${r1.sigungu}는 ${r2.sido} ${r2.sigungu}보다 학원이 ${(r1.total - r2.total).toLocaleString()}개 더 많습니다.`
      );
    } else if (r2.total > r1.total) {
      insights.push(
        `${r2.sido} ${r2.sigungu}는 ${r1.sido} ${r1.sigungu}보다 학원이 ${(r2.total - r1.total).toLocaleString()}개 더 많습니다.`
      );
    }

    // 가장 많은 분야 비교
    const top1 = [...r1.byRealm].sort((a, b) => b.count - a.count)[0];
    const top2 = [...r2.byRealm].sort((a, b) => b.count - a.count)[0];
    if (top1 && top2) {
      if (top1.realm === top2.realm) {
        insights.push(`두 지역 모두 ${top1.realm} 분야가 가장 많습니다.`);
      } else {
        insights.push(
          `${r1.sido} ${r1.sigungu}는 ${top1.realm}, ${r2.sido} ${r2.sigungu}는 ${top2.realm} 분야가 가장 많은 비중을 차지합니다.`
        );
      }
    }

    // 수강료 비교
    if (r1.avgTuition && r2.avgTuition) {
      const diff = Math.abs(r1.avgTuition - r2.avgTuition);
      const higher = r1.avgTuition > r2.avgTuition ? `${r1.sido} ${r1.sigungu}` : `${r2.sido} ${r2.sigungu}`;
      insights.push(
        `평균 수강료는 ${higher}가 약 ${Math.round(diff / 10000).toLocaleString()}만원 더 높습니다.`
      );
    }

    setInsight(insights.join(' '));
  };

  return (
    <PageShell
      title="지역 비교 분석"
      description="시도·시군구 단위로 두 지역의 사교육 환경 (학원 수·분야·수강료)을 나란히 비교합니다."
      onOpenSearch={() => setCmdOpen(true)}
    >
      <CommandSearch open={cmdOpen} onOpenChange={setCmdOpen} />
      <div>
        {/* 지역 선택 — Card 컴포넌트 적용 */}
        <Card padding="lg" className="mb-8">
          <h2 className="text-lg font-bold text-secondary-800 mb-4">비교할 두 지역을 선택하세요</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 지역 1 */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-accent-600">지역 1</p>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={sido1}
                  onChange={(e) => setSido1(e.target.value)}
                  className="w-full px-3 py-2.5 border border-secondary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-white"
                >
                  <option value="">시/도 선택</option>
                  {SIDO_LIST.map((sido) => (
                    <option key={sido} value={sido}>{sido}</option>
                  ))}
                </select>
                <select
                  value={sigungu1}
                  onChange={(e) => setSigungu1(e.target.value)}
                  disabled={!sido1}
                  className="w-full px-3 py-2.5 border border-secondary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent bg-white disabled:bg-secondary-100 disabled:text-secondary-400"
                >
                  <option value="">시/군/구 선택</option>
                  {sigunguList1.map((sg) => (
                    <option key={sg} value={sg}>{sg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* VS 구분선 */}
            <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
            </div>

            {/* 지역 2 */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-indigo-600">지역 2</p>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={sido2}
                  onChange={(e) => setSido2(e.target.value)}
                  className="w-full px-3 py-2.5 border border-secondary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">시/도 선택</option>
                  {SIDO_LIST.map((sido) => (
                    <option key={sido} value={sido}>{sido}</option>
                  ))}
                </select>
                <select
                  value={sigungu2}
                  onChange={(e) => setSigungu2(e.target.value)}
                  disabled={!sido2}
                  className="w-full px-3 py-2.5 border border-secondary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-secondary-100 disabled:text-secondary-400"
                >
                  <option value="">시/군/구 선택</option>
                  {sigunguList2.map((sg) => (
                    <option key={sg} value={sg}>{sg}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 비교 버튼 — Button 컴포넌트 적용 */}
          <div className="mt-6 flex justify-center">
            <Button
              variant="default"
              size="lg"
              onClick={handleCompare}
              disabled={!sido1 || !sigungu1 || !sido2 || !sigungu2 || isLoading}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {isLoading ? '비교 분석 중...' : '비교하기'}
            </Button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-error-500">{error}</p>
          )}
        </Card>

        {/* 로딩 스켈레톤 */}
        {isLoading && (
          <div className="space-y-6">
            {/* 인사이트 스켈레톤 */}
            <div className="bg-accent-50/50 rounded-2xl p-6 border border-accent-100">
              <div className="flex items-start gap-3">
                <Skeleton circle width="w-8" height="h-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton width="w-24" height="h-4" />
                  <Skeleton width="w-full" height="h-3" />
                  <Skeleton width="w-3/4" height="h-3" />
                </div>
              </div>
            </div>
            {/* 비교 카드 스켈레톤 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        )}

        {/* 비교 결과 — 페이드인 애니메이션 */}
        <AnimatePresence>
          {data1 && data2 && !isLoading && (
            <motion.div
              className="space-y-6"
              variants={resultContainerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              {/* 인사이트 — Card 컴포넌트 적용 */}
              {insight && (
                <motion.div
                  variants={resultItemVariants}
                  className="bg-gradient-to-r from-accent-50 to-indigo-50 rounded-2xl p-6 border border-accent-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-accent-800 mb-1">분석 인사이트</h3>
                      <p className="text-sm text-accent-700 leading-relaxed">{insight}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 비교 카드 — Card 컴포넌트 적용 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { data: data1, label: '지역 1', color: 'blue' },
                  { data: data2, label: '지역 2', color: 'indigo' },
                ].map(({ data, label, color }) => (
                  <Card
                    key={label}
                    padding="none"
                    variants={resultItemVariants}
                    className="overflow-hidden"
                  >
                    {/* 지역 헤더 */}
                    <div className={`px-6 py-4 bg-gradient-to-r ${color === 'blue' ? 'from-accent-500 to-accent-600' : 'from-indigo-500 to-indigo-600'}`}>
                      <p className={`text-xs ${color === 'blue' ? 'text-accent-200' : 'text-indigo-200'}`}>{label}</p>
                      <h3 className="text-lg font-bold text-white">
                        {data.sido} {data.sigungu}
                      </h3>
                    </div>

                    {/* 숫자 카드 */}
                    <div className="grid grid-cols-2 gap-3 p-6">
                      <div className="bg-secondary-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-secondary-500">전체 학원 수</p>
                        <p className="text-2xl font-bold text-secondary-800 mt-1">
                          {data.total.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-secondary-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-secondary-500">평균 수강료</p>
                        <p className="text-2xl font-bold text-secondary-800 mt-1">
                          {data.avgTuition
                            ? `${Math.round(data.avgTuition / 10000)}만`
                            : '-'}
                        </p>
                      </div>
                    </div>

                    {/* 분야별 분포 차트 */}
                    <div className="px-6 pb-6">
                      <h4 className="text-sm font-semibold text-secondary-800 mb-3">분야별 분포</h4>
                      <RealmPieChart
                        data={data.byRealm.map((r) => ({
                          realm: r.realm,
                          count: r.count,
                        }))}
                        height={240}
                        innerRadius={40}
                        outerRadius={75}
                      />
                    </div>

                    {/* 분야별 수치 */}
                    <div className="px-6 pb-6">
                      <div className="space-y-2">
                        {[...data.byRealm]
                          .sort((a, b) => b.count - a.count)
                          .map((item) => (
                            <div key={item.realm} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: getRealmColor(item.realm) }}
                                />
                                <span className="text-sm text-secondary-600">{item.realm}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-secondary-800">
                                  {item.count.toLocaleString()}
                                </span>
                                <span className="text-xs text-secondary-400 w-12 text-right">
                                  {(item.ratio * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* 비교 바 차트 — Card 컴포넌트 적용 */}
              {data1 && data2 && (
                <Card padding="lg" variants={resultItemVariants}>
                  <h3 className="text-lg font-bold text-secondary-800 mb-4">분야별 비율 비교</h3>
                  <RegionBarChart
                    data={data1.byRealm.map((r) => {
                      const r2Match = data2.byRealm.find((r2) => r2.realm === r.realm);
                      return {
                        realm: r.realm,
                        ratio: r.ratio,
                        avgRatio: r2Match?.ratio || 0,
                      };
                    })}
                    height={350}
                  />
                  <div className="mt-3 flex justify-center gap-6 text-xs text-secondary-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-accent-500" />
                      {data1.sido} {data1.sigungu}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-sm bg-secondary-300" />
                      {data2.sido} {data2.sigungu}
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RealmPieChart from '@/components/charts/RealmPieChart';
import RegionBarChart from '@/components/charts/RegionBarChart';
import { REALM_COLORS } from '@/lib/constants';

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
    const top1 = r1.byRealm.sort((a, b) => b.count - a.count)[0];
    const top2 = r2.byRealm.sort((a, b) => b.count - a.count)[0];
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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">대동학원도</span>
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-medium text-gray-600">지역 비교</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 지역 선택 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">비교할 두 지역을 선택하세요</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 지역 1 */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-blue-600">지역 1</p>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={sido1}
                  onChange={(e) => setSido1(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400"
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">시/군/구 선택</option>
                  {sigunguList2.map((sg) => (
                    <option key={sg} value={sg}>{sg}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 비교 버튼 */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleCompare}
              disabled={!sido1 || !sigungu1 || !sido2 || !sigungu2 || isLoading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  비교 분석 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  비교하기
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* 비교 결과 */}
        {data1 && data2 && (
          <div className="animate-fade-in-up space-y-6">
            {/* 인사이트 */}
            {insight && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-800 mb-1">분석 인사이트</h3>
                    <p className="text-sm text-blue-700 leading-relaxed">{insight}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 비교 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { data: data1, label: '지역 1', color: 'blue' },
                { data: data2, label: '지역 2', color: 'indigo' },
              ].map(({ data, label, color }) => (
                <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* 지역 헤더 */}
                  <div className={`px-6 py-4 bg-gradient-to-r ${color === 'blue' ? 'from-blue-500 to-blue-600' : 'from-indigo-500 to-indigo-600'}`}>
                    <p className={`text-xs ${color === 'blue' ? 'text-blue-200' : 'text-indigo-200'}`}>{label}</p>
                    <h3 className="text-lg font-bold text-white">
                      {data.sido} {data.sigungu}
                    </h3>
                  </div>

                  {/* 숫자 카드 */}
                  <div className="grid grid-cols-2 gap-3 p-6">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500">전체 학원 수</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">
                        {data.total.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-gray-500">평균 수강료</p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">
                        {data.avgTuition
                          ? `${Math.round(data.avgTuition / 10000)}만`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* 분야별 분포 차트 */}
                  <div className="px-6 pb-6">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">분야별 분포</h4>
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
                      {data.byRealm
                        .sort((a, b) => b.count - a.count)
                        .map((item) => (
                          <div key={item.realm} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: REALM_COLORS[item.realm] || '#6B7280' }}
                              />
                              <span className="text-sm text-gray-600">{item.realm}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-800">
                                {item.count.toLocaleString()}
                              </span>
                              <span className="text-xs text-gray-400 w-12 text-right">
                                {(item.ratio * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 비교 바 차트 */}
            {data1 && data2 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">분야별 비율 비교</h3>
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
                <div className="mt-3 flex justify-center gap-6 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-500" />
                    {data1.sido} {data1.sigungu}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-gray-300" />
                    {data2.sido} {data2.sigungu}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

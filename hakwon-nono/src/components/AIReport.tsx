'use client';

import { useState, useCallback } from 'react';

/** AI 리포트 데이터 구조 */
interface ReportData {
  summary: string;
  realm_analysis: Array<{
    realm: string;
    count: number;
    ratio: number;
    avg_ratio: number;
    insight: string;
  }>;
  school_suggestions: Array<{
    program: string;
    reason: string;
    target: string;
  }>;
  parent_info: string;
  data_note: string;
}

interface AIReportProps {
  regionKey: string;
  autoLoad?: boolean;
}

export default function AIReport({ regionKey, autoLoad = false }: AIReportProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // AI 리포트 생성 요청
  const generateReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analysis/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionKey }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '리포트 생성 실패');
      }

      const data = await res.json();
      // reportContent가 문자열인 경우 파싱
      const reportContent =
        typeof data.reportContent === 'string'
          ? JSON.parse(data.reportContent)
          : data.reportContent;

      setReport(reportContent);
      setIsLoaded(true);
    } catch (err) {
      console.error('AI 리포트 생성 오류:', err);
      setError(err instanceof Error ? err.message : 'AI 리포트를 생성할 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [regionKey]);

  // 자동 로드
  if (autoLoad && !isLoaded && !isLoading && !error) {
    generateReport();
  }

  // 로딩 스켈레톤
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* AI 배지 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
          <div className="h-4 w-40 bg-gray-200 rounded" />
        </div>

        {/* 요약 스켈레톤 */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-3 w-full bg-gray-200 rounded" />
          <div className="h-3 w-4/5 bg-gray-200 rounded" />
          <div className="h-3 w-3/5 bg-gray-200 rounded" />
        </div>

        {/* 분석 스켈레톤 */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* 제안 스켈레톤 */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-2/3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 mb-3">{error}</p>
        <button
          onClick={generateReport}
          className="text-sm text-blue-500 hover:text-blue-600 font-medium"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 초기 상태 - 리포트 생성 버튼
  if (!report && !isLoaded) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">AI 분석 리포트</h3>
        <p className="text-sm text-gray-500 mb-4">
          이 지역의 사교육 현황을 AI가 분석합니다
        </p>
        <button
          onClick={generateReport}
          className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-violet-600 hover:to-indigo-700 transition-all shadow-sm hover:shadow-md"
        >
          리포트 생성하기
        </button>
      </div>
    );
  }

  // 리포트 표시
  if (!report) return null;

  return (
    <div className="space-y-5">
      {/* AI 배지 */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
          AI가 분석한 리포트입니다
        </span>
      </div>

      {/* 사교육 현황 요약 */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          사교육 현황 요약
        </h4>
        <p className="text-sm text-blue-700 leading-relaxed">{report.summary}</p>
      </div>

      {/* 분야별 분석 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          분야별 분석
        </h4>
        <div className="space-y-2">
          {report.realm_analysis.map((item) => (
            <div
              key={item.realm}
              className="bg-gray-50 rounded-lg p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-800">{item.realm}</span>
                <span className="text-xs text-gray-500">
                  {item.count}개 ({(item.ratio * 100).toFixed(1)}%)
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{item.insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 방과후 프로그램 제안 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          방과후 프로그램 제안
        </h4>
        <div className="space-y-3">
          {report.school_suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="bg-emerald-50 rounded-lg p-4 border border-emerald-100"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <div>
                  <h5 className="text-sm font-semibold text-emerald-800">
                    {suggestion.program}
                  </h5>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    {suggestion.reason}
                  </p>
                  <span className="inline-block mt-2 text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    대상: {suggestion.target}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 학부모 관점 정보 */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
        <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          학부모 참고 정보
        </h4>
        <p className="text-sm text-amber-700 leading-relaxed">{report.parent_info}</p>
      </div>

      {/* 데이터 한계 안내 */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{report.data_note}</span>
        </p>
      </div>
    </div>
  );
}

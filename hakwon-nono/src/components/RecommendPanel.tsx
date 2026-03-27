'use client';

import { useState, useCallback } from 'react';
import { getRealmColor, getRealmLabel, ALL_REALMS } from '@/lib/constants';

/** 추천 학원 정보 */
interface RecommendedAcademy {
  id: string;
  name: string;
  realm: string | null;
  subject: string | null;
  tuitionFee: number | null;
  distance: number;
}

/** 추천 결과 */
interface RecommendResult {
  recommendation: string;
  academies: RecommendedAcademy[];
  schoolName: string;
  total: number;
}

interface RecommendPanelProps {
  school: {
    id: string;
    name: string;
    kind: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  onClose: () => void;
  embedded?: boolean;
}

export default function RecommendPanel({ school, onClose, embedded }: RecommendPanelProps) {
  // 폼 상태
  const [budget, setBudget] = useState(30);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [radius, setRadius] = useState(2);

  // 결과 상태
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 관심 분야 토글
  const toggleInterest = useCallback((realm: string) => {
    setSelectedInterests((prev) =>
      prev.includes(realm)
        ? prev.filter((r) => r !== realm)
        : [...prev, realm]
    );
  }, []);

  // AI 추천 요청
  const handleSubmit = useCallback(async () => {
    if (!school) {
      setError('학교를 먼저 선택해주세요');
      return;
    }
    if (selectedInterests.length === 0) {
      setError('관심 분야를 1개 이상 선택해주세요');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          budget,
          interests: selectedInterests,
          radius,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'AI 추천 요청에 실패했습니다');
      }

      setResult(data);
    } catch (err) {
      console.error('AI 추천 오류:', err);
      setError(
        err instanceof Error ? err.message : 'AI 추천 요청에 실패했습니다'
      );
    } finally {
      setIsLoading(false);
    }
  }, [school, budget, selectedInterests, radius]);

  // 마크다운 스타일 텍스트를 간단히 렌더링
  const renderRecommendation = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // 볼드 처리: **텍스트**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={j} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={j}>{part}</span>;
      });

      // 헤딩 스타일
      if (line.match(/^\d+\.\s*\*\*/)) {
        return (
          <p key={i} className="text-sm font-medium text-gray-800 mt-4 mb-1">
            {rendered}
          </p>
        );
      }
      // 리스트 아이템
      if (line.startsWith('- ') || line.startsWith('  - ')) {
        return (
          <p key={i} className="text-sm text-gray-600 ml-4 my-0.5">
            {rendered}
          </p>
        );
      }
      // 빈 줄
      if (line.trim() === '') {
        return <br key={i} />;
      }
      // 일반 텍스트
      return (
        <p key={i} className="text-sm text-gray-700 my-0.5">
          {rendered}
        </p>
      );
    });
  };

  const radiusOptions = [1, 2, 3, 5];

  return (
    <div className={embedded ? "flex flex-col h-full overflow-hidden" : "fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-2xl z-30 flex flex-col overflow-hidden animate-slide-in-right"}>
      {/* 헤더 */}
      <div className="flex-shrink-0 bg-gradient-to-r from-violet-600 to-blue-600 text-white p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">
                AI 추천
              </span>
            </div>
            <h2 className="text-lg font-bold">AI 학원 추천</h2>
            <p className="text-sm text-violet-200 mt-1">
              {school
                ? `${school.name} 기준`
                : '학교를 선택하면 맞춤 추천을 받을 수 있습니다'}
            </p>
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
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 입력 폼 */}
        <div className="p-5 space-y-5 border-b border-gray-100">
          {/* 학교 정보 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              기준 학교
            </label>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700">
              {school ? (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-medium">{school.name}</span>
                  {school.kind && (
                    <span className="text-xs text-gray-400">({school.kind})</span>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">
                  지도에서 학교를 검색/선택해주세요
                </span>
              )}
            </div>
          </div>

          {/* 월 예산 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              월 예산
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Math.max(1, parseInt(e.target.value) || 0))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                min={1}
                step={5}
              />
              <span className="text-sm text-gray-500 flex-shrink-0">만원</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              월 {budget.toLocaleString('ko-KR')}만원 = 연 {(budget * 12).toLocaleString('ko-KR')}만원
            </p>
          </div>

          {/* 관심 분야 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              관심 분야 (복수 선택)
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_REALMS.map((realm) => {
                const isSelected = selectedInterests.includes(realm);
                const color = getRealmColor(realm);
                return (
                  <button
                    key={realm}
                    onClick={() => toggleInterest(realm)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      isSelected
                        ? 'text-white border-transparent shadow-sm'
                        : 'text-gray-600 border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: color, borderColor: color }
                        : undefined
                    }
                  >
                    {getRealmLabel(realm)}
                  </button>
                );
              })}
            </div>
            {selectedInterests.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">
                분야를 선택해주세요
              </p>
            )}
          </div>

          {/* 검색 반경 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              검색 반경
            </label>
            <div className="flex gap-2">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    radius === r
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !school || selectedInterests.length === 0}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                AI 분석 중...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI 추천 받기
              </span>
            )}
          </button>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">
                AI가 최적의 학원 조합을 분석 중입니다...
              </p>
              <p className="text-xs text-gray-400">약 10~20초 소요됩니다</p>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !isLoading && (
          <div className="p-5">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">오류 발생</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 추천 결과 */}
        {result && !isLoading && (
          <div className="p-5 space-y-5">
            {/* 결과 헤더 */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-800">
                AI 추천 결과
              </h3>
              <span className="text-xs text-gray-400">
                ({result.total}개 학원 분석)
              </span>
            </div>

            {/* AI 추천 텍스트 */}
            <div className="bg-gradient-to-br from-gray-50 to-violet-50/30 rounded-xl p-4 border border-gray-100">
              {renderRecommendation(result.recommendation)}
            </div>

            {/* 주변 학원 카드 목록 */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-3">
                주변 학원 목록
              </h4>
              <div className="space-y-2">
                {result.academies.map((academy) => {
                  const realmColor = getRealmColor(academy.realm || '');
                  return (
                    <div
                      key={academy.id}
                      className="bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {academy.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {academy.realm && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                                style={{ backgroundColor: realmColor }}
                              >
                                {getRealmLabel(academy.realm)}
                              </span>
                            )}
                            {academy.subject && (
                              <span className="text-xs text-gray-400 truncate">
                                {academy.subject}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          {academy.tuitionFee ? (
                            <p className="text-sm font-semibold text-gray-800">
                              {Math.round(academy.tuitionFee / 10000).toLocaleString('ko-KR')}
                              만원
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">정보없음</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {academy.distance < 1
                              ? `${Math.round(academy.distance * 1000)}m`
                              : `${academy.distance.toFixed(1)}km`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

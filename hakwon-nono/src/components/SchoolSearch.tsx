'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/** 학교 검색 결과 */
export interface SchoolResult {
  id: string;
  schoolNm: string;
  schoolKind: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface SchoolSearchProps {
  onSchoolSelect: (school: SchoolResult) => void;
}

export default function SchoolSearch({ onSchoolSelect }: SchoolSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색 API 호출 (디바운스 적용)
  const searchSchools = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/schools/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.schools || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      }
    } catch (err) {
      console.error('학교 검색 오류:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 입력 변경 핸들러
  const handleInputChange = (value: string) => {
    setQuery(value);

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = setTimeout(() => {
      searchSchools(value);
    }, 300);
  };

  // 학교 선택 핸들러
  const handleSelect = (school: SchoolResult) => {
    setQuery(school.schoolNm);
    setIsOpen(false);
    setResults([]);
    onSchoolSelect(school);
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 클린업
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // 학교 유형 라벨
  const getSchoolKindLabel = (kind: string | null) => {
    switch (kind) {
      case '초등학교': return '초';
      case '중학교': return '중';
      case '고등학교': return '고';
      default: return kind?.charAt(0) || '';
    }
  };

  // 학교 유형별 색상
  const getSchoolKindColor = (kind: string | null) => {
    switch (kind) {
      case '초등학교': return 'bg-green-100 text-green-700';
      case '중학교': return 'bg-blue-100 text-blue-700';
      case '고등학교': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="relative flex-1 max-w-md">
      {/* 검색 입력 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="학교 이름으로 검색..."
          aria-label="학교 검색"
          className="w-full h-10 pl-10 pr-10 text-sm bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
        />
        {/* 검색 아이콘 */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* 로딩 / 클리어 */}
        {isLoading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : query.length > 0 ? (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* 검색 결과 드롭다운 */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 max-h-80 overflow-y-auto"
        >
          {results.map((school, index) => (
            <button
              key={school.id}
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSelect(school)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              {/* 학교 유형 배지 */}
              <span
                className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${getSchoolKindColor(
                  school.schoolKind
                )}`}
              >
                {getSchoolKindLabel(school.schoolKind)}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {school.schoolNm}
                </p>
                {school.address && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {school.address}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {isOpen && results.length === 0 && query.length >= 2 && !isLoading && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
        >
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500">검색 결과가 없습니다</p>
            <p className="text-xs text-gray-400 mt-1">다른 검색어를 입력해보세요</p>
          </div>
        </div>
      )}
    </div>
  );
}

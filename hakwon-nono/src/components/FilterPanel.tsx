'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { getRealmColor, getRealmLabel, ALL_REALMS } from '@/lib/constants';
import { Filter, Check } from 'lucide-react';

/** 뷰 모드 타입 */
export type ViewMode = 'marker' | 'heatmap';

interface FilterPanelProps {
  selectedRealms: string[];
  onRealmsChange: (realms: string[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/** 필터 패널 — 뷰 모드 토글 및 분야 필터 */
function FilterPanel({
  selectedRealms,
  onRealmsChange,
  viewMode,
  onViewModeChange,
}: FilterPanelProps) {
  const [showRealmDropdown, setShowRealmDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowRealmDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAll = () => {
    if (selectedRealms.length === ALL_REALMS.length) {
      onRealmsChange([]);
    } else {
      onRealmsChange([...ALL_REALMS]);
    }
  };

  const handleRealmToggle = (realm: string) => {
    if (selectedRealms.includes(realm)) {
      onRealmsChange(selectedRealms.filter((r) => r !== realm));
    } else {
      onRealmsChange([...selectedRealms, realm]);
    }
  };

  const isAllSelected = selectedRealms.length === ALL_REALMS.length;
  const filterCount = ALL_REALMS.length - selectedRealms.length;

  return (
    <div className="px-6 py-2.5 flex items-center gap-2 border-t border-gray-50 overflow-x-auto scrollbar-hide">
      {/* 뷰 모드 토글 */}
      <div className="flex bg-gray-100 rounded-full p-0.5 flex-shrink-0">
        <button
          onClick={() => onViewModeChange('marker')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
            viewMode === 'marker'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          마커
        </button>
        <button
          onClick={() => onViewModeChange('heatmap')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
            viewMode === 'heatmap'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          히트맵
        </button>
      </div>

      {/* 구분선 */}
      <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

      {/* 분야 필터 드롭다운 */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setShowRealmDropdown(!showRealmDropdown)}
          aria-label="분야 필터 열기"
          aria-expanded={showRealmDropdown}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border rounded-full transition-all ${
            filterCount > 0
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-900 hover:shadow-sm'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          분야
          {filterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-white text-gray-900 text-[10px] flex items-center justify-center font-bold">
              {filterCount}
            </span>
          )}
        </button>

        {/* 드롭다운 */}
        {showRealmDropdown && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[1200] animate-fade-in-up">
            {/* 전체 선택 */}
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={handleSelectAll}
                className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium text-gray-800">전체 선택</span>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  isAllSelected ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                }`}>
                  {isAllSelected && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>
              </button>
            </div>

            {/* 분야 목록 */}
            <div className="p-2 max-h-72 overflow-y-auto">
              {ALL_REALMS.map((realm) => {
                const isChecked = selectedRealms.includes(realm);
                const color = getRealmColor(realm);

                return (
                  <button
                    key={realm}
                    onClick={() => handleRealmToggle(realm)}
                    className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-gray-700 flex-1 text-left">
                      {getRealmLabel(realm)}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors`}
                      style={{
                        backgroundColor: isChecked ? color : 'transparent',
                        borderColor: isChecked ? color : '#D1D5DB',
                      }}
                    >
                      {isChecked && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 개별 분야 필 (선택된 것들을 가로로 나열) */}
      {ALL_REALMS.map((realm) => {
        const isChecked = selectedRealms.includes(realm);
        const color = getRealmColor(realm);

        return (
          <button
            key={realm}
            onClick={() => handleRealmToggle(realm)}
            aria-pressed={isChecked}
            aria-label={`${REALM_LABELS[realm] || realm} 필터`}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              isChecked
                ? 'bg-white border-gray-300 text-gray-800 hover:border-gray-400'
                : 'bg-gray-100 border-transparent text-gray-400 line-through hover:bg-gray-200'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color, opacity: isChecked ? 1 : 0.3 }}
            />
            {getRealmLabel(realm)}
          </button>
        );
      })}
    </div>
  );
}

/** 불필요한 리렌더링 방지를 위한 메모이제이션 */
export default memo(FilterPanel);

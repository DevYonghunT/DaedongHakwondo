'use client';

import { useState } from 'react';
import { REALM_COLORS, ALL_REALMS, REALM_LABELS } from '@/lib/constants';

/** 뷰 모드 타입 */
export type ViewMode = 'marker' | 'heatmap';

interface FilterPanelProps {
  selectedRealms: string[];
  onRealmsChange: (realms: string[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function FilterPanel({
  selectedRealms,
  onRealmsChange,
  viewMode,
  onViewModeChange,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // 전체 선택/해제 토글
  const handleSelectAll = () => {
    if (selectedRealms.length === ALL_REALMS.length) {
      onRealmsChange([]);
    } else {
      onRealmsChange([...ALL_REALMS]);
    }
  };

  // 개별 분야 토글
  const handleRealmToggle = (realm: string) => {
    if (selectedRealms.includes(realm)) {
      onRealmsChange(selectedRealms.filter((r) => r !== realm));
    } else {
      onRealmsChange([...selectedRealms, realm]);
    }
  };

  const isAllSelected = selectedRealms.length === ALL_REALMS.length;

  return (
    <div className="absolute top-4 left-4 z-[1000]">
      {/* 토글 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label={isOpen ? '필터 닫기' : '필터 열기'}
      >
        {/* 필터 아이콘 */}
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="text-sm font-medium text-gray-700">필터</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 필터 패널 */}
      {isOpen && (
        <div className="mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* 뷰 모드 토글 */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              보기 방식
            </p>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('marker')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'marker'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {/* 마커 아이콘 */}
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  마커
                </span>
              </button>
              <button
                onClick={() => onViewModeChange('heatmap')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  viewMode === 'heatmap'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {/* 히트맵 아이콘 */}
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm0-10a4 4 0 100 8 4 4 0 000-8zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                  히트맵
                </span>
              </button>
            </div>
          </div>

          {/* 분야 필터 */}
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              학원 분야
            </p>

            {/* 전체 선택 */}
            <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isAllSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 group-hover:border-gray-400'
                  }`}
                >
                  {isAllSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-800">전체</span>
            </label>

            <div className="h-px bg-gray-100 my-2" />

            {/* 개별 분야 */}
            <div className="space-y-0.5">
              {ALL_REALMS.map((realm) => {
                const isChecked = selectedRealms.includes(realm);
                const color = REALM_COLORS[realm];

                return (
                  <label
                    key={realm}
                    className="flex items-center gap-3 py-1.5 cursor-pointer group"
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleRealmToggle(realm)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors`}
                        style={{
                          backgroundColor: isChecked ? color : 'transparent',
                          borderColor: isChecked ? color : '#D1D5DB',
                        }}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {/* 색상 인디케이터 */}
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {REALM_LABELS[realm] || realm}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

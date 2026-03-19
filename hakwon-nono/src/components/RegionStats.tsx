'use client';

import { REALM_COLORS, REALM_LABELS } from '@/lib/constants';

/** 지역 통계 데이터 */
export interface RegionStatsData {
  total: number;
  breakdown: Array<{
    realm: string;
    count: number;
    ratio: number;
  }>;
}

interface RegionStatsProps {
  stats: RegionStatsData | null;
}

export default function RegionStats({ stats }: RegionStatsProps) {
  if (!stats || stats.total === 0) return null;

  return (
    <div className="absolute bottom-6 right-4 z-10 w-72">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-100">현재 화면 영역</span>
            <span className="text-lg font-bold text-white">
              {stats.total.toLocaleString()}개
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-0.5">학원/교습소</p>
        </div>

        {/* 분야별 비율 */}
        <div className="p-4">
          {/* 비율 바 */}
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            {stats.breakdown
              .filter((item) => item.ratio > 0)
              .sort((a, b) => b.ratio - a.ratio)
              .map((item) => (
                <div
                  key={item.realm}
                  className="transition-all duration-300"
                  style={{
                    width: `${item.ratio * 100}%`,
                    backgroundColor: REALM_COLORS[item.realm] || '#6B7280',
                  }}
                  title={`${item.realm}: ${(item.ratio * 100).toFixed(1)}%`}
                />
              ))}
          </div>

          {/* 분야별 상세 */}
          <div className="space-y-1.5">
            {stats.breakdown
              .filter((item) => item.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map((item) => (
                <div key={item.realm} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: REALM_COLORS[item.realm] || '#6B7280' }}
                    />
                    <span className="text-gray-600">
                      {REALM_LABELS[item.realm] || item.realm}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800 font-medium">
                      {item.count.toLocaleString()}
                    </span>
                    <span className="text-gray-400 w-12 text-right">
                      {(item.ratio * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}

            {/* 나머지 분야가 있으면 표시 */}
            {stats.breakdown.filter((item) => item.count > 0).length > 5 && (
              <div className="text-xs text-gray-400 text-center pt-1">
                +{stats.breakdown.filter((item) => item.count > 0).length - 5}개 분야 더보기
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

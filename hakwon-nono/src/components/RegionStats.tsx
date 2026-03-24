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

  const sorted = [...stats.breakdown]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const top5 = sorted.slice(0, 5);
  const remaining = sorted.length - 5;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex items-stretch overflow-hidden">
        {/* 총 개수 */}
        <div className="px-5 py-3 flex flex-col justify-center border-r border-gray-100">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">현재 영역</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold text-gray-900">
              {stats.total.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">개</span>
          </div>
        </div>

        {/* 비율 바 + 상위 분야 */}
        <div className="px-4 py-3 flex items-center gap-4">
          {/* 비율 바 */}
          <div className="flex h-2 rounded-full overflow-hidden w-32">
            {sorted
              .filter((item) => item.ratio > 0)
              .map((item) => (
                <div
                  key={item.realm}
                  className="transition-all duration-300"
                  style={{
                    width: `${item.ratio * 100}%`,
                    backgroundColor: REALM_COLORS[item.realm] || '#6B7280',
                  }}
                  title={`${REALM_LABELS[item.realm] || item.realm}: ${(item.ratio * 100).toFixed(1)}%`}
                />
              ))}
          </div>

          {/* 상위 3개 분야 */}
          <div className="hidden sm:flex items-center gap-3">
            {top5.slice(0, 3).map((item) => (
              <div key={item.realm} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: REALM_COLORS[item.realm] || '#6B7280' }}
                />
                <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                  {REALM_LABELS[item.realm] || item.realm}
                </span>
                <span className="text-[11px] text-gray-400">
                  {(item.ratio * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {remaining > 0 && (
              <span className="text-[10px] text-gray-400">
                +{remaining}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

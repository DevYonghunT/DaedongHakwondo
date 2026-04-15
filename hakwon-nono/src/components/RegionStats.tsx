"use client";

import { memo } from "react";
import { TrendingUp } from "lucide-react";
import { getRealmColor, getRealmLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
  className?: string;
}

/** 지도 하단 중앙 — 현재 영역 학원 통계 카드 (Claude 톤) */
function RegionStats({ stats, className }: RegionStatsProps) {
  if (!stats || stats.total === 0) return null;

  const sorted = [...stats.breakdown]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const top3 = sorted.slice(0, 3);
  const remaining = sorted.length - 3;

  return (
    <div
      className={cn(
        "absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] max-w-[min(94vw,640px)]",
        className,
      )}
    >
      <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-card/95 backdrop-blur shadow-overlay">
        {/* 총 개수 */}
        <div className="px-5 py-3 flex flex-col justify-center border-r border-border">
          <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <TrendingUp className="h-3 w-3" />
            현재 영역
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-semibold text-foreground tabular-nums">
              {stats.total.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">개</span>
          </div>
        </div>

        {/* 비율 바 + 상위 분야 */}
        <div className="px-4 py-3 flex items-center gap-4 min-w-0">
          {/* 비율 바 */}
          <div className="flex h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            {sorted
              .filter((item) => item.ratio > 0)
              .map((item) => (
                <div
                  key={item.realm}
                  className="transition-all"
                  style={{
                    width: `${item.ratio * 100}%`,
                    backgroundColor: getRealmColor(item.realm),
                  }}
                  title={`${getRealmLabel(item.realm)}: ${(item.ratio * 100).toFixed(1)}%`}
                />
              ))}
          </div>

          {/* 상위 분야 */}
          <div className="hidden sm:flex items-center gap-3 min-w-0">
            {top3.map((item) => (
              <div key={item.realm} className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: getRealmColor(item.realm) }}
                />
                <span className="text-xs text-foreground/80 font-medium truncate max-w-[80px]">
                  {getRealmLabel(item.realm)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {(item.ratio * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {remaining > 0 && (
              <span className="text-xs text-muted-foreground">+{remaining}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(RegionStats);

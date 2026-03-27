'use client';

interface SkeletonProps {
  className?: string;
  /** 원형 스켈레톤 (아바타 등) */
  circle?: boolean;
  /** 너비 (Tailwind 클래스) */
  width?: string;
  /** 높이 (Tailwind 클래스) */
  height?: string;
}

/** 스켈레톤 로더 — 에어비앤비 스타일 shimmer 효과 */
export default function Skeleton({
  className = '',
  circle = false,
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={`
        relative overflow-hidden bg-secondary-100
        ${circle ? 'rounded-full' : 'rounded-xl'}
        ${width || 'w-full'}
        ${height || 'h-4'}
        ${className}
      `}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

/** 카드 스켈레톤 — 데이터 카드 로딩 상태 */
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-secondary-200 p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton circle width="w-10" height="h-10" />
        <div className="flex-1 space-y-2">
          <Skeleton width="w-2/3" height="h-4" />
          <Skeleton width="w-1/3" height="h-3" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton height="h-3" />
        <Skeleton width="w-4/5" height="h-3" />
        <Skeleton width="w-3/5" height="h-3" />
      </div>
    </div>
  );
}

/** 통계 카드 스켈레톤 */
export function StatSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-secondary-200 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton circle width="w-10" height="h-10" />
        <Skeleton width="w-24" height="h-4" />
      </div>
      <Skeleton width="w-32" height="h-8" />
    </div>
  );
}

/** 리스트 아이템 스켈레톤 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <Skeleton circle width="w-8" height="h-8" />
      <div className="flex-1 space-y-1.5">
        <Skeleton width="w-3/4" height="h-3.5" />
        <Skeleton width="w-1/2" height="h-3" />
      </div>
      <Skeleton width="w-12" height="h-5" />
    </div>
  );
}

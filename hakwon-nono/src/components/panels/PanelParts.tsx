"use client";

import { ReactNode } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useFavorites, type FavoriteItem } from "@/lib/hooks/useFavorites";

interface PanelHeaderProps {
  /** 카테고리 라벨 (학원 / 학교 등) */
  eyebrow?: ReactNode;
  /** 메인 제목 */
  title: ReactNode;
  /** 부제 (학교 종류, 학원 분야 등) */
  subtitle?: ReactNode;
  /** 좌측 배지 (분야 색상점 등) */
  badge?: ReactNode;
  /** 즐겨찾기 대상 (있으면 별 버튼 노출) */
  favorite?: Omit<FavoriteItem, "addedAt">;
  /** 닫기 콜백 (없으면 X 버튼 미노출) */
  onClose?: () => void;
}

/** 사이드 패널 공통 헤더 — Claude 톤 */
export function PanelHeader({
  eyebrow,
  title,
  subtitle,
  badge,
  favorite,
  onClose,
}: PanelHeaderProps) {
  const { isFavorite, toggle } = useFavorites();
  const active = favorite ? isFavorite(favorite.id, favorite.type) : false;

  return (
    <div className="px-5 py-4 border-b border-border bg-card">
      <div className="flex items-start gap-3">
        {badge && <div className="mt-1">{badge}</div>}
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {eyebrow}
            </div>
          )}
          <h2 className="font-serif-display text-lg font-semibold leading-tight text-foreground truncate">
            {title}
          </h2>
          {subtitle && (
            <div className="mt-1 text-sm text-muted-foreground truncate">{subtitle}</div>
          )}
        </div>
        <div className="flex items-center gap-1 -mr-1">
          {favorite && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => toggle(favorite)}
              aria-label={active ? "즐겨찾기 해제" : "즐겨찾기"}
            >
              <Star
                className={cn("h-4 w-4", active && "fill-warning text-warning")}
              />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="닫기">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PanelSectionProps {
  title?: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** 사이드 패널 섹션 */
export function PanelSection({ title, icon, hint, children, className }: PanelSectionProps) {
  return (
    <section className={cn("px-5 py-4 border-b border-border last:border-b-0", className)}>
      {title && (
        <div className="mb-3 flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {hint && <span className="ml-auto text-xs text-muted-foreground">{hint}</span>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

/** 정보 행 (label : value) */
export function InfoRow({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 py-1.5", className)}>
      <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-foreground flex-1 break-words">{value || "-"}</span>
    </div>
  );
}

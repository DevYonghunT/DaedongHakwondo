"use client";

import { ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

interface PageShellProps {
  /** 헤더 우측 액션 (옵션) */
  headerActions?: ReactNode;
  /** 페이지 헤딩 영역 */
  title?: ReactNode;
  /** 페이지 부제/설명 */
  description?: ReactNode;
  /** Cmd+K 콜백 */
  onOpenSearch?: () => void;
  /** 풋터 표시 여부 */
  hideFooter?: boolean;
  children: ReactNode;
}

/** 분석 페이지용 표준 셸 — Header + 컨테이너 + Footer */
export default function PageShell({
  headerActions,
  title,
  description,
  onOpenSearch,
  hideFooter = false,
  children,
}: PageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader actions={headerActions} onOpenSearch={onOpenSearch} />
      <main className="flex-1">
        <div className="container px-4 py-8">
          {(title || description) && (
            <header className="mb-7">
              {title && (
                <h1 className="font-serif-display text-display text-foreground">
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  {description}
                </p>
              )}
            </header>
          )}
          {children}
        </div>
      </main>
      {!hideFooter && <SiteFooter />}
    </div>
  );
}

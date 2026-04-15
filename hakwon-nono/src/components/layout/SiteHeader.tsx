"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map as MapIcon,
  BarChart3,
  GitCompare,
  Coins,
  Accessibility,
  Lightbulb,
  Search,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/Sheet";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  /** 현재 페이지의 우측에 노출할 액션 슬롯 (예: 필터/모드 토글) */
  actions?: React.ReactNode;
  /** 검색창 표시 여부 (메인 지도에서만 false) */
  showSearchHint?: boolean;
  /** Cmd+K 검색창 열기 핸들러 */
  onOpenSearch?: () => void;
  /** 헤더를 투명하게 (지도 위에 띄울 때) */
  variant?: "default" | "floating";
}

/** 페이지 공통 헤더 — Claude.ai 톤 (크림 배경, 오렌지 액센트) */
export default function SiteHeader({
  actions,
  showSearchHint = true,
  onOpenSearch,
  variant = "default",
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const navItems = [
    { href: "/", label: "지도", icon: MapIcon },
    { href: "/dashboard", label: "전국 현황", icon: BarChart3 },
    { href: "/compare", label: "지역 비교", icon: GitCompare },
    { href: "/tuition", label: "수강료", icon: Coins },
    { href: "/equity", label: "접근성", icon: Accessibility },
    { href: "/insights", label: "인사이트", icon: Lightbulb },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-[1100] w-full border-b border-border",
        variant === "default" && "bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70",
        variant === "floating" && "bg-card/85 backdrop-blur",
      )}
    >
      <div className="container flex h-14 items-center gap-3 px-4">
        {/* 로고 */}
        <Link href="/" className="group flex items-center gap-2.5 mr-1">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="hidden sm:flex items-baseline gap-1.5">
            <span className="font-serif-display text-base font-semibold text-foreground">
              대동학원도
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
              beta
            </Badge>
          </div>
        </Link>

        {/* 검색 트리거 (Cmd+K) */}
        {showSearchHint && (
          <button
            onClick={onOpenSearch}
            className="hidden md:flex items-center gap-2 ml-2 h-9 px-3 max-w-md flex-1 rounded-md border border-border bg-card hover:bg-secondary text-sm text-muted-foreground transition-colors"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">학교, 학원, 지역 검색...</span>
            <kbd className="pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">{isMac ? "⌘" : "Ctrl"}</span>K
            </kbd>
          </button>
        )}

        {/* 네비게이션 (데스크탑) */}
        <nav className="ml-auto hidden lg:flex items-center gap-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* 우측 액션 슬롯 */}
        {actions && (
          <div className="hidden md:flex items-center gap-2 ml-2">{actions}</div>
        )}

        {/* 모바일 메뉴 */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="lg:hidden ml-auto">
              <Menu className="h-5 w-5" />
              <span className="sr-only">메뉴</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex items-center justify-between mb-6">
              <span className="font-serif-display text-lg font-semibold">대동학원도</span>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "inline-flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "text-primary bg-primary/10"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 pt-6 border-t border-border text-xs text-muted-foreground">
              <p>제8회 교육 공공데이터</p>
              <p>AI 활용대회 출품작</p>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

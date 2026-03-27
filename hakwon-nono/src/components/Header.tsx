'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  BarChart3,
  GitCompare,
  Coins,
  Accessibility,
  Lightbulb,
  Map,
  Menu,
  X,
} from 'lucide-react';

/** 네비게이션 항목 정의 */
const NAV_ITEMS = [
  { href: '/dashboard', label: '전국 현황', icon: BarChart3 },
  { href: '/compare', label: '지역 비교', icon: GitCompare },
  { href: '/tuition', label: '수강료', icon: Coins },
  { href: '/equity', label: '접근성', icon: Accessibility },
  { href: '/insights', label: '인사이트', icon: Lightbulb },
] as const;

interface HeaderProps {
  /** 페이지 부제목 (예: "전국 현황 대시보드") */
  title?: string;
}

/** 공통 헤더 네비게이션 컴포넌트 */
export default function Header({ title }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-secondary-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-secondary-900">대동학원도</span>
        </Link>

        {/* 페이지 부제목 */}
        {title && (
          <>
            <span className="text-secondary-300 hidden sm:inline">|</span>
            <h1 className="text-sm font-medium text-secondary-600 hidden sm:block">{title}</h1>
          </>
        )}

        {/* 데스크탑 네비게이션 */}
        <nav className="ml-auto hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}

          {/* 지도 보기 버튼 */}
          <Link
            href="/"
            className="ml-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Map className="w-3.5 h-3.5" />
            지도 보기
          </Link>
        </nav>

        {/* 모바일 햄버거 버튼 */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="ml-auto md:hidden p-2 text-secondary-600 hover:text-secondary-900 rounded-lg hover:bg-secondary-100 transition-colors"
          aria-label="메뉴 열기"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 모바일 메뉴 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-secondary-200 bg-white">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}

            {/* 모바일 지도 보기 버튼 */}
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-1 px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center gap-2 justify-center"
            >
              <Map className="w-4 h-4" />
              지도 보기
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

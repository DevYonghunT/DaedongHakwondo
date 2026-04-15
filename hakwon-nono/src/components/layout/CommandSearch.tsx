"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Map as MapIcon,
  BarChart3,
  GitCompare,
  Coins,
  Accessibility,
  Lightbulb,
  School,
  Star,
  ArrowRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/Command";
import { useFavorites } from "@/lib/hooks/useFavorites";

interface SchoolHit {
  id: string;
  schoolNm: string;
  schoolKind: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 학교 선택 핸들러. 전달되지 않으면 메인 페이지로 라우팅 */
  onSchoolSelect?: (school: SchoolHit) => void;
}

/** 전역 명령창 — 학교 검색 + 페이지 점프 + 즐겨찾기 */
export default function CommandSearch({
  open,
  onOpenChange,
  onSchoolSelect,
}: CommandSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SchoolHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { favorites } = useFavorites();

  // 학교 검색 (디바운스)
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/schools/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.schools || []);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [query, open]);

  const handleSchool = useCallback(
    (school: SchoolHit) => {
      onOpenChange(false);
      setQuery("");
      if (onSchoolSelect) {
        onSchoolSelect(school);
      } else {
        router.push(`/?schoolId=${school.id}`);
      }
    },
    [onSchoolSelect, router, onOpenChange],
  );

  const navTo = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const navItems = [
    { href: "/", label: "지도 보기", icon: MapIcon },
    { href: "/dashboard", label: "전국 현황 대시보드", icon: BarChart3 },
    { href: "/compare", label: "지역 비교", icon: GitCompare },
    { href: "/tuition", label: "수강료 분석", icon: Coins },
    { href: "/equity", label: "접근성 격차", icon: Accessibility },
    { href: "/insights", label: "데이터 인사이트", icon: Lightbulb },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="학교 이름, 페이지 검색..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? "검색 중..." : query.length >= 2 ? "검색 결과가 없습니다" : "최소 2자 이상 입력해주세요"}
        </CommandEmpty>

        {results.length > 0 && (
          <>
            <CommandGroup heading="학교">
              {results.slice(0, 8).map((school) => (
                <CommandItem
                  key={school.id}
                  value={`school-${school.id}-${school.schoolNm}`}
                  onSelect={() => handleSchool(school)}
                >
                  <School className="text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{school.schoolNm}</div>
                    {school.address && (
                      <div className="text-xs text-muted-foreground truncate">
                        {school.schoolKind} · {school.address}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="ml-auto opacity-40" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {favorites.length > 0 && query.length < 2 && (
          <>
            <CommandGroup heading="즐겨찾기">
              {favorites.slice(0, 5).map((fav) => (
                <CommandItem
                  key={`fav-${fav.id}`}
                  value={`fav-${fav.id}-${fav.name}`}
                  onSelect={() => {
                    onOpenChange(false);
                    router.push(fav.type === "school" ? `/?schoolId=${fav.id}` : `/?academyId=${fav.id}`);
                  }}
                >
                  <Star className="text-warning fill-current" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{fav.name}</div>
                    {fav.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">{fav.subtitle}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="페이지 이동">
          {navItems.map((item) => (
            <CommandItem
              key={item.href}
              value={`nav-${item.href}-${item.label}`}
              onSelect={() => navTo(item.href)}
            >
              <item.icon className="text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

"use client";

import { useState, memo } from "react";
import { Filter, Check, MapPin, Flame, Eye, EyeOff } from "lucide-react";
import { getRealmColor, getRealmLabel, ALL_REALMS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/Popover";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

/** 뷰 모드 타입 */
export type ViewMode = "marker" | "heatmap";

interface FilterPanelProps {
  selectedRealms: string[];
  onRealmsChange: (realms: string[]) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  /** 컴팩트 모드 (헤더 우측 액션 슬롯 등) */
  compact?: boolean;
}

/** 필터 + 뷰 모드 콤팩트 패널 — Claude 톤 */
function FilterPanel({
  selectedRealms,
  onRealmsChange,
  viewMode,
  onViewModeChange,
  compact = false,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  const isAllSelected = selectedRealms.length === ALL_REALMS.length;
  const isNoneSelected = selectedRealms.length === 0;
  const filterCount = ALL_REALMS.length - selectedRealms.length;

  const toggleAll = () => {
    if (isAllSelected) onRealmsChange([]);
    else onRealmsChange([...ALL_REALMS]);
  };

  const toggleRealm = (realm: string) => {
    if (selectedRealms.includes(realm)) {
      onRealmsChange(selectedRealms.filter((r) => r !== realm));
    } else {
      onRealmsChange([...selectedRealms, realm]);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        !compact && "px-4 h-12 border-t border-border bg-background/80 backdrop-blur",
      )}
    >
      {/* 뷰 모드 토글 */}
      <div className="inline-flex h-9 items-center rounded-md bg-secondary p-0.5">
        <button
          onClick={() => onViewModeChange("marker")}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-sm transition-colors",
            viewMode === "marker"
              ? "bg-card text-foreground shadow-subtle"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MapPin className="h-3.5 w-3.5" />
          마커
        </button>
        <button
          onClick={() => onViewModeChange("heatmap")}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-sm transition-colors",
            viewMode === "heatmap"
              ? "bg-card text-foreground shadow-subtle"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Flame className="h-3.5 w-3.5" />
          히트맵
        </button>
      </div>

      {/* 분야 필터 팝오버 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={filterCount > 0 ? "default" : "outline"}
            size="sm"
            className="gap-1.5 h-9"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>분야</span>
            {filterCount > 0 && !isNoneSelected && (
              <Badge
                variant="outline"
                className="h-5 px-1.5 ml-0.5 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
              >
                {ALL_REALMS.length - filterCount}
              </Badge>
            )}
            {isNoneSelected && (
              <Badge variant="outline" className="h-5 px-1.5 ml-0.5">전체 해제</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-2">
          {/* 전체 토글 */}
          <button
            onClick={toggleAll}
            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm font-medium hover:bg-secondary transition-colors"
          >
            <span className="flex items-center gap-2">
              {isAllSelected ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {isAllSelected ? "전체 해제" : "전체 선택"}
            </span>
            <Badge variant="secondary">
              {selectedRealms.length}/{ALL_REALMS.length}
            </Badge>
          </button>
          <div className="my-1 h-px bg-border" />
          <div className="max-h-72 overflow-y-auto">
            {ALL_REALMS.map((realm) => {
              const isChecked = selectedRealms.includes(realm);
              const color = getRealmColor(realm);
              return (
                <button
                  key={realm}
                  onClick={() => toggleRealm(realm)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="flex-1 text-left text-foreground">
                    {getRealmLabel(realm)}
                  </span>
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors",
                      isChecked ? "border-transparent" : "border-border",
                    )}
                    style={{ backgroundColor: isChecked ? color : "transparent" }}
                  >
                    {isChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* 컴팩트가 아닐 때만 가로 필 노출 */}
      {!compact && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {ALL_REALMS.map((realm) => {
            const isChecked = selectedRealms.includes(realm);
            const color = getRealmColor(realm);
            return (
              <button
                key={realm}
                onClick={() => toggleRealm(realm)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-full border transition-all",
                  isChecked
                    ? "bg-card border-border text-foreground hover:border-primary/50"
                    : "bg-secondary/50 border-transparent text-muted-foreground line-through",
                )}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: color, opacity: isChecked ? 1 : 0.4 }}
                />
                {getRealmLabel(realm)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(FilterPanel);

"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { RADIUS_OPTIONS } from "@/lib/constants";
import type { SchoolResult } from "@/components/SchoolSearch";
import RealmPieChart from "@/components/charts/RealmPieChart";
import RegionBarChart from "@/components/charts/RegionBarChart";
import AIReport from "@/components/AIReport";
import { PanelHeader, PanelSection } from "@/components/panels/PanelParts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatDistance, formatTuition } from "@/lib/utils";
import { School as SchoolIcon } from "lucide-react";

interface NearbyStats {
  total: number;
  byRealm: Array<{
    realm: string;
    count: number;
    ratio: number;
    avgRatio: number;
  }>;
  avgTuition: number | null;
  academies: Array<{
    id: string;
    academyNm: string;
    realmScNm: string | null;
    distance: number;
  }>;
}

interface SchoolDashboardProps {
  school: SchoolResult;
  onClose: () => void;
  onRadiusChange?: (radius: number) => void;
  embedded?: boolean;
}

function getKindBadgeVariant(kind: string | null) {
  switch (kind) {
    case "초등학교":
      return "success" as const;
    case "중학교":
      return "default" as const;
    case "고등학교":
      return "soft" as const;
    default:
      return "secondary" as const;
  }
}

export default function SchoolDashboard({
  school,
  onClose,
  onRadiusChange,
  embedded,
}: SchoolDashboardProps) {
  const [radius, setRadius] = useState(2);
  const [stats, setStats] = useState<NearbyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "list" | "ai">("overview");

  const fetchNearbyStats = useCallback(async () => {
    if (!school.latitude || !school.longitude) {
      setError("학교 위치 정보가 없습니다");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/schools/${school.id}/nearby?radius=${radius}`);
      if (!res.ok) throw new Error("데이터 조회 실패");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("주변 학원 조회 오류:", err);
      setError("주변 학원 정보를 불러올 수 없습니다");
    } finally {
      setIsLoading(false);
    }
  }, [school.id, school.latitude, school.longitude, radius]);

  useEffect(() => {
    fetchNearbyStats();
  }, [fetchNearbyStats]);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    onRadiusChange?.(newRadius);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background",
        !embedded &&
          "fixed top-0 right-0 h-full w-full sm:w-[440px] z-30 shadow-modal border-l border-border animate-slide-in-right",
      )}
    >
      <PanelHeader
        eyebrow="학교 대시보드"
        title={school.schoolNm}
        subtitle={
          school.schoolKind && (
            <Badge variant={getKindBadgeVariant(school.schoolKind)} className="h-5 px-2 text-[11px]">
              {school.schoolKind}
            </Badge>
          )
        }
        badge={
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <SchoolIcon className="h-4 w-4" />
          </span>
        }
        favorite={{
          id: school.id,
          type: "school",
          name: school.schoolNm,
          subtitle: school.schoolKind || undefined,
        }}
        onClose={onClose}
      />

      {/* 반경 선택 */}
      <div className="px-5 py-3 border-b border-border bg-card/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          탐색 반경
        </p>
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <Button
              key={r}
              variant={radius === r ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => handleRadiusChange(r)}
            >
              {r}km
            </Button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col flex-1 overflow-hidden">
        <div className="px-5 pt-3 border-b border-border">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">개요</TabsTrigger>
            <TabsTrigger value="list" className="flex-1">학원 목록</TabsTrigger>
            <TabsTrigger value="ai" className="flex-1">AI 분석</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">주변 학원 분석 중...</p>
              </div>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-5">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchNearbyStats} className="mt-3">
                  다시 시도
                </Button>
              </div>
            </div>
          )}

          {stats && !isLoading && !error && (
            <>
              <TabsContent value="overview" className="mt-0">
                {/* 요약 KPI */}
                <PanelSection>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                      <p className="text-[11px] text-muted-foreground">반경 {radius}km 학원</p>
                      <p className="text-2xl font-semibold text-primary mt-0.5 tabular-nums">
                        {stats.total.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-success/5 border border-success/20 p-3">
                      <p className="text-[11px] text-muted-foreground">평균 수강료</p>
                      <p className="text-2xl font-semibold text-success mt-0.5 tabular-nums">
                        {stats.avgTuition ? formatTuition(stats.avgTuition) : "—"}
                      </p>
                    </div>
                  </div>
                </PanelSection>

                <PanelSection title="분야별 분포">
                  <RealmPieChart
                    data={stats.byRealm.map((r) => ({ realm: r.realm, count: r.count }))}
                    height={240}
                  />
                </PanelSection>

                <PanelSection title="시도 평균 대비">
                  <RegionBarChart
                    data={stats.byRealm.map((r) => ({
                      realm: r.realm,
                      ratio: r.ratio,
                      avgRatio: r.avgRatio,
                    }))}
                    height={240}
                  />
                </PanelSection>
              </TabsContent>

              <TabsContent value="list" className="mt-0">
                {stats.academies.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    반경 {radius}km 내 학원이 없습니다
                  </p>
                ) : (
                  <>
                    <div className="px-5 py-2 bg-secondary/30 text-xs text-muted-foreground border-b border-border">
                      총 {stats.academies.length}개 학원
                    </div>
                    <div className="divide-y divide-border">
                      {stats.academies.map((academy) => (
                        <div key={academy.id} className="px-5 py-3 hover:bg-secondary/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {academy.academyNm}
                              </p>
                              {academy.realmScNm && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {academy.realmScNm}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                              {formatDistance(academy.distance)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="ai" className="mt-0 p-5">
                <AIReport regionKey={`school-${school.id}-${radius}km`} autoLoad={false} />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}

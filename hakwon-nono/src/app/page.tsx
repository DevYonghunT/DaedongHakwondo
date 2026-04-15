"use client";

import { useState, useCallback, useRef, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Star, X } from "lucide-react";
import MapView, { type MapBounds, type MapMarkerData } from "@/components/MapView";
import FilterPanel, { type ViewMode } from "@/components/FilterPanel";
import RegionStats, { type RegionStatsData } from "@/components/RegionStats";
import AcademyDetail from "@/components/AcademyDetail";
import SchoolDetail from "@/components/SchoolDetail";
import RecommendPanel from "@/components/RecommendPanel";
import SchoolDashboard from "@/components/SchoolDashboard";
import SiteHeader from "@/components/layout/SiteHeader";
import CommandSearch from "@/components/layout/CommandSearch";
import { Button } from "@/components/ui/Button";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { ALL_REALMS } from "@/lib/constants";
import { useCmdK } from "@/lib/hooks/useCmdK";
import { useFavorites } from "@/lib/hooks/useFavorites";

interface SchoolHit {
  id: string;
  schoolNm: string;
  schoolKind: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAcademyId = searchParams.get("academyId");
  const initialSchoolId = searchParams.get("schoolId");

  // 상태
  const [selectedRealms, setSelectedRealms] = useState<string[]>([...ALL_REALMS]);
  const [viewMode, setViewMode] = useState<ViewMode>("marker");
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStatsData | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolHit | null>(null);
  const [schoolRadius, setSchoolRadius] = useState(2);
  const [, setIsLoadingAcademies] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedAcademyId, setSelectedAcademyId] = useState<string | null>(initialAcademyId);
  const [showSchoolDetail, setShowSchoolDetail] = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);
  const [showCmdK, setShowCmdK] = useState(false);
  const [favSheetOpen, setFavSheetOpen] = useState(false);

  // Cmd+K 단축키
  useCmdK(() => setShowCmdK(true));

  // URL → 학교 쿼리 파라미터로 들어왔을 때 자동 로드
  useEffect(() => {
    if (initialSchoolId && !selectedSchool) {
      (async () => {
        try {
          const res = await fetch(`/api/schools/${initialSchoolId}/detail`);
          if (res.ok) {
            const json = await res.json();
            const s = json.school;
            setSelectedSchool({
              id: s.id,
              schoolNm: s.name,
              schoolKind: s.kind,
              address: s.address,
              latitude: s.lat,
              longitude: s.lng,
            });
            setShowSchoolDetail(true);
          }
        } catch (err) {
          console.warn("URL 학교 로드 실패", err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSchoolId]);

  // 사이드패널 활성 여부
  const hasSidePanel = !!(
    selectedAcademyId ||
    (showSchoolDetail && selectedSchool) ||
    showRecommend ||
    selectedSchool
  );

  // 지도 인스턴스 참조
  const mapRef = useRef<unknown>(null);
  const boundsRef = useRef<MapBounds | null>(null);

  // 학원 데이터 로드
  const selectedRealmsRef = useRef<string[]>(selectedRealms);
  selectedRealmsRef.current = selectedRealms;

  const fetchAcademies = useCallback(
    async (bounds: MapBounds, realmsOverride?: string[]) => {
      setIsLoadingAcademies(true);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = setTimeout(() => setShowLoadingIndicator(true), 300);

      try {
        const realms = realmsOverride ?? selectedRealmsRef.current;
        if (realms.length === 0) {
          setMarkers([]);
          setRegionStats({ total: 0, breakdown: [] });
          return;
        }
        const realmParam =
          realms.length < ALL_REALMS.length
            ? `&realm=${encodeURIComponent(realms.join(","))}`
            : "";
        const res = await fetch(
          `/api/academies?swLat=${bounds.sw.lat}&swLng=${bounds.sw.lng}&neLat=${bounds.ne.lat}&neLng=${bounds.ne.lng}${realmParam}&limit=5000`,
        );
        if (!res.ok) throw new Error("데이터 조회 실패");
        const data = await res.json();
        const academies = data.academies || [];

        const newMarkers: MapMarkerData[] = academies
          .filter(
            (a: { latitude: number | null; longitude: number | null }) =>
              a.latitude && a.longitude,
          )
          .map(
            (a: {
              id: string;
              latitude: number;
              longitude: number;
              academyNm: string;
              realmScNm: string | null;
            }) => ({
              id: a.id,
              lat: a.latitude,
              lng: a.longitude,
              name: a.academyNm,
              realm: a.realmScNm || undefined,
              type: "academy" as const,
            }),
          );
        setMarkers(newMarkers);

        const realmCounts: Record<string, number> = {};
        newMarkers.forEach((m: MapMarkerData) => {
          const realm = m.realm || "기타";
          realmCounts[realm] = (realmCounts[realm] || 0) + 1;
        });
        const total = newMarkers.length;
        const breakdown = Object.entries(realmCounts).map(([realm, count]) => ({
          realm,
          count,
          ratio: total > 0 ? count / total : 0,
        }));
        setRegionStats({ total, breakdown });
      } catch (err) {
        console.error("학원 데이터 조회 오류:", err);
      } finally {
        setIsLoadingAcademies(false);
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        setShowLoadingIndicator(false);
      }
    },
    [],
  );

  const handleBoundsChanged = useCallback(
    (bounds: MapBounds) => {
      boundsRef.current = bounds;
      fetchAcademies(bounds);
    },
    [fetchAcademies],
  );

  const handleMapReady = useCallback((map: unknown) => {
    mapRef.current = map;
  }, []);

  const handleSchoolSelect = useCallback((school: SchoolHit) => {
    setSelectedSchool(school);
    setShowSchoolDetail(true);
    setSelectedAcademyId(null);
    setShowRecommend(false);
  }, []);

  const schoolPosition = useMemo(() => {
    if (selectedSchool?.latitude && selectedSchool?.longitude) {
      return { lat: selectedSchool.latitude, lng: selectedSchool.longitude };
    }
    return null;
  }, [selectedSchool?.latitude, selectedSchool?.longitude]);

  const handleRealmsChange = useCallback(
    (realms: string[]) => {
      setSelectedRealms(realms);
      if (boundsRef.current) {
        fetchAcademies(boundsRef.current, realms);
      }
    },
    [fetchAcademies],
  );

  const closeAllPanels = useCallback(() => {
    setSelectedAcademyId(null);
    setShowSchoolDetail(false);
    setShowRecommend(false);
    setSelectedSchool(null);
    // URL 정리
    if (initialAcademyId || initialSchoolId) {
      router.replace("/");
    }
  }, [initialAcademyId, initialSchoolId, router]);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 헤더 */}
      <SiteHeader
        onOpenSearch={() => setShowCmdK(true)}
        actions={
          <FavoritesQuickButton onOpen={() => setFavSheetOpen(true)} />
        }
        variant="floating"
      />

      {/* 필터 바 (헤더 하단) */}
      <FilterPanel
        selectedRealms={selectedRealms}
        onRealmsChange={handleRealmsChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 relative overflow-hidden flex">
        {/* 지도 영역 */}
        <div className="flex-1 relative">
          <MapView
            onMapReady={handleMapReady}
            onBoundsChanged={handleBoundsChanged}
            markers={viewMode === "marker" ? markers : []}
            heatmapData={viewMode === "heatmap" ? markers : []}
            onMarkerClick={(marker) => {
              if (marker.type !== "school") {
                setSelectedAcademyId(marker.id);
                setSelectedSchool(null);
                setShowRecommend(false);
              }
            }}
            selectedSchoolPosition={schoolPosition}
            radiusKm={selectedSchool ? schoolRadius : undefined}
            onSchoolMarkerClick={() => {
              if (selectedSchool) {
                setShowSchoolDetail(true);
                setSelectedAcademyId(null);
              }
            }}
          />

          {/* 로딩 인디케이터 */}
          <AnimatePresence>
            {showLoadingIndicator && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100]"
              >
                <div className="rounded-full border border-border bg-card/95 backdrop-blur px-4 py-2 shadow-overlay flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-xs font-medium text-foreground">데이터 로딩 중...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 지역 통계 (하단 중앙) */}
          <RegionStats stats={regionStats} />

          {/* 히트맵 범례 */}
          {viewMode === "heatmap" && (
            <div className="absolute bottom-6 left-6 z-[1000] rounded-xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-overlay">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                학원 밀집도
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">낮음</span>
                <div className="flex h-2 overflow-hidden rounded-full">
                  {["#60A5FA", "#A78BFA", "#F472B6", "#FBBF24", "#F87171"].map((color) => (
                    <div key={color} className="h-2 w-7" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">높음</span>
              </div>
            </div>
          )}

          {/* AI 추천 FAB */}
          {!showRecommend && (
            <Button
              onClick={() => {
                setShowRecommend(true);
                setSelectedAcademyId(null);
                setShowSchoolDetail(false);
              }}
              className="absolute bottom-6 right-6 z-[1000] shadow-overlay"
              size="lg"
            >
              <Sparkles className="h-4 w-4" />
              AI 추천
            </Button>
          )}
        </div>

        {/* 데스크탑 사이드 패널 */}
        {hasSidePanel && (
          <aside className="w-[440px] flex-shrink-0 border-l border-border bg-card relative z-[1050] animate-slide-in-right overflow-hidden hidden md:block">
            <div className="h-full overflow-y-auto">
              {selectedAcademyId && (
                <AcademyDetail
                  academyId={selectedAcademyId}
                  onClose={() => setSelectedAcademyId(null)}
                  embedded
                />
              )}
              {showSchoolDetail && selectedSchool && !selectedAcademyId && (
                <SchoolDetail
                  schoolId={selectedSchool.id}
                  onClose={() => setShowSchoolDetail(false)}
                  embedded
                />
              )}
              {showRecommend && !selectedAcademyId && !(showSchoolDetail && selectedSchool) && (
                <RecommendPanel
                  school={
                    selectedSchool
                      ? {
                          id: selectedSchool.id,
                          name: selectedSchool.schoolNm,
                          kind: selectedSchool.schoolKind,
                          lat: selectedSchool.latitude,
                          lng: selectedSchool.longitude,
                        }
                      : null
                  }
                  onClose={() => setShowRecommend(false)}
                  embedded
                />
              )}
              {selectedSchool && !selectedAcademyId && !showSchoolDetail && !showRecommend && (
                <SchoolDashboard
                  school={selectedSchool}
                  onClose={() => setSelectedSchool(null)}
                  onRadiusChange={setSchoolRadius}
                  embedded
                />
              )}
            </div>
            {/* 닫기 모두 */}
            <button
              onClick={closeAllPanels}
              className="absolute top-3 right-3 z-10 h-7 w-7 rounded-md inline-flex items-center justify-center bg-card/80 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="패널 모두 닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </aside>
        )}

        {/* 모바일 사이드 패널 (Sheet) */}
        <Sheet open={hasSidePanel} onOpenChange={(open) => !open && closeAllPanels()}>
          <SheetContent side="bottom" className="md:hidden h-[80vh] p-0 overflow-y-auto">
            {selectedAcademyId && (
              <AcademyDetail
                academyId={selectedAcademyId}
                onClose={() => setSelectedAcademyId(null)}
                embedded
              />
            )}
            {showSchoolDetail && selectedSchool && !selectedAcademyId && (
              <SchoolDetail
                schoolId={selectedSchool.id}
                onClose={() => setShowSchoolDetail(false)}
                embedded
              />
            )}
            {showRecommend && !selectedAcademyId && !(showSchoolDetail && selectedSchool) && (
              <RecommendPanel
                school={
                  selectedSchool
                    ? {
                        id: selectedSchool.id,
                        name: selectedSchool.schoolNm,
                        kind: selectedSchool.schoolKind,
                        lat: selectedSchool.latitude,
                        lng: selectedSchool.longitude,
                      }
                    : null
                }
                onClose={() => setShowRecommend(false)}
                embedded
              />
            )}
            {selectedSchool && !selectedAcademyId && !showSchoolDetail && !showRecommend && (
              <SchoolDashboard
                school={selectedSchool}
                onClose={() => setSelectedSchool(null)}
                onRadiusChange={setSchoolRadius}
                embedded
              />
            )}
          </SheetContent>
        </Sheet>
      </main>

      {/* Cmd+K 명령창 */}
      <CommandSearch open={showCmdK} onOpenChange={setShowCmdK} onSchoolSelect={handleSchoolSelect} />

      {/* 즐겨찾기 시트 */}
      <FavoritesSheet open={favSheetOpen} onOpenChange={setFavSheetOpen} />
    </div>
  );
}

function FavoritesQuickButton({ onOpen }: { onOpen: () => void }) {
  const { favorites } = useFavorites();
  return (
    <Button variant="ghost" size="sm" onClick={onOpen} className="gap-1.5">
      <Star className="h-3.5 w-3.5" />
      즐겨찾기
      {favorites.length > 0 && (
        <span className="rounded-full bg-primary/15 text-primary px-1.5 text-[10px] font-semibold tabular-nums">
          {favorites.length}
        </span>
      )}
    </Button>
  );
}

function FavoritesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { favorites, remove } = useFavorites();
  const router = useRouter();

  const goTo = (item: { id: string; type: string }) => {
    onOpenChange(false);
    if (item.type === "school") router.push(`/?schoolId=${item.id}`);
    else router.push(`/?academyId=${item.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[380px]">
        <div className="flex items-center gap-2 mb-5">
          <Star className="h-5 w-5 text-warning fill-warning" />
          <h2 className="font-serif-display text-lg font-semibold">즐겨찾기</h2>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {favorites.length}개
          </span>
        </div>
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            아직 즐겨찾기한 학교/학원이 없습니다.
            <br />
            상세 패널의 ⭐ 버튼으로 추가해보세요.
          </p>
        ) : (
          <div className="space-y-1.5">
            {favorites.map((fav) => (
              <div
                key={`${fav.type}-${fav.id}`}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-primary/30 transition-colors"
              >
                <button onClick={() => goTo(fav)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">{fav.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {fav.type === "school" ? "학교" : "학원"} · {fav.subtitle || ""}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(fav.id, fav.type)}
                  aria-label="제거"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

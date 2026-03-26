'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import MapView, { type MapBounds, type MapMarkerData } from '@/components/MapView';
import FilterPanel, { type ViewMode } from '@/components/FilterPanel';
import RegionStats, { type RegionStatsData } from '@/components/RegionStats';
import SchoolSearch, { type SchoolResult } from '@/components/SchoolSearch';
import SchoolDashboard from '@/components/SchoolDashboard';
import AcademyDetail from '@/components/AcademyDetail';
import SchoolDetail from '@/components/SchoolDetail';
import RecommendPanel from '@/components/RecommendPanel';
import { ALL_REALMS } from '@/lib/constants';

export default function Home() {
  // 상태 관리
  const [selectedRealms, setSelectedRealms] = useState<string[]>([...ALL_REALMS]);
  const [viewMode, setViewMode] = useState<ViewMode>('marker');
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStatsData | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolResult | null>(null);
  const [schoolRadius, setSchoolRadius] = useState(2);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedAcademyId, setSelectedAcademyId] = useState<string | null>(null);
  const [showSchoolDetail, setShowSchoolDetail] = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // 사이드패널 활성 여부
  const hasSidePanel = !!(selectedAcademyId || (showSchoolDetail && selectedSchool) || showRecommend || selectedSchool);

  // 지도 인스턴스 참조
  const mapRef = useRef<unknown>(null);
  const boundsRef = useRef<MapBounds | null>(null);

  // 학원 데이터 로드
  const selectedRealmsRef = useRef<string[]>(selectedRealms);
  selectedRealmsRef.current = selectedRealms;

  const fetchAcademies = useCallback(
    async (bounds: MapBounds, realmsOverride?: string[]) => {

      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = setTimeout(() => setShowLoadingIndicator(true), 300);

      try {
        const realms = realmsOverride ?? selectedRealmsRef.current;

        if (realms.length === 0) {
          setMarkers([]);
          setRegionStats({ total: 0, breakdown: [] });

          return;
        }

        const realmParam = realms.length < ALL_REALMS.length
          ? `&realm=${encodeURIComponent(realms.join(','))}`
          : '';

        const res = await fetch(
          `/api/academies?swLat=${bounds.sw.lat}&swLng=${bounds.sw.lng}&neLat=${bounds.ne.lat}&neLng=${bounds.ne.lng}${realmParam}&limit=5000`
        );

        if (!res.ok) throw new Error('데이터 조회 실패');

        const data = await res.json();
        const academies = data.academies || [];

        const newMarkers: MapMarkerData[] = academies
          .filter((a: { latitude: number | null; longitude: number | null }) => a.latitude && a.longitude)
          .map((a: { id: string; latitude: number; longitude: number; academyNm: string; realmScNm: string | null }) => ({
            id: a.id,
            lat: a.latitude,
            lng: a.longitude,
            name: a.academyNm,
            realm: a.realmScNm || undefined,
            type: 'academy' as const,
          }));

        setMarkers(newMarkers);

        // 정확한 통계는 API에서 제공 (LIMIT 없이 집계된 값)
        if (data.stats) {
          setRegionStats(data.stats);
        } else {
          // fallback: API가 stats를 반환하지 않는 경우 마커 기반 계산
          const realmCounts: Record<string, number> = {};
          newMarkers.forEach((m: MapMarkerData) => {
            const realm = m.realm || '기타';
            realmCounts[realm] = (realmCounts[realm] || 0) + 1;
          });

          const total = newMarkers.length;
          const breakdown = Object.entries(realmCounts).map(([realm, count]) => ({
            realm,
            count,
            ratio: total > 0 ? count / total : 0,
          }));

          setRegionStats({ total, breakdown });
        }
      } catch (err) {
        console.error('학원 데이터 조회 오류:', err);
      } finally {
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        setShowLoadingIndicator(false);
      }
    },
    []
  );

  const handleBoundsChanged = useCallback(
    (bounds: MapBounds) => {
      boundsRef.current = bounds;
      fetchAcademies(bounds);
    },
    [fetchAcademies]
  );

  const handleMapReady = useCallback((map: unknown) => {
    mapRef.current = map;
  }, []);

  const handleSchoolSelect = useCallback((school: SchoolResult) => {
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

  const handleCloseDashboard = useCallback(() => {
    setSelectedSchool(null);
  }, []);

  const handleRealmsChange = useCallback(
    (realms: string[]) => {
      setSelectedRealms(realms);
      if (boundsRef.current) {
        fetchAcademies(boundsRef.current, realms);
      }
    },
    [fetchAcademies]
  );

  // 모든 사이드 패널 닫기
  const closeAllPanels = useCallback(() => {
    setSelectedAcademyId(null);
    setShowSchoolDetail(false);
    setShowRecommend(false);
    setSelectedSchool(null);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ── 헤더 (Airbnb 스타일) ── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-100 z-[1100]">
        {/* 상단 네비게이션 */}
        <div className="h-16 px-6 flex items-center gap-4">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 mr-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:inline tracking-tight">
              대동학원도
            </span>
          </Link>

          {/* 검색바 (Airbnb 스타일 pill) */}
          <div className="flex-1 max-w-xl">
            <SchoolSearch onSchoolSelect={handleSchoolSelect} />
          </div>

          {/* 네비게이션 링크 */}
          <nav aria-label="메인 네비게이션" className="hidden lg:flex items-center gap-1 ml-auto">
            {[
              { href: '/dashboard', label: '전국 현황' },
              { href: '/compare', label: '지역 비교' },
              { href: '/tuition', label: '수강료' },
              { href: '/equity', label: '접근성' },
              { href: '/insights', label: '인사이트' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 모바일 메뉴 버튼 */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label={mobileNavOpen ? '메뉴 닫기' : '메뉴 열기'}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mobileNavOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* 모바일 네비게이션 드롭다운 */}
        {mobileNavOpen && (
          <div className="lg:hidden border-t border-gray-100 px-4 py-2 bg-white animate-fade-in">
            {[
              { href: '/dashboard', label: '전국 현황' },
              { href: '/compare', label: '지역 비교' },
              { href: '/tuition', label: '수강료 현황' },
              { href: '/equity', label: '접근성 분석' },
              { href: '/insights', label: '데이터 인사이트' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                onClick={() => setMobileNavOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* 필터 바 (가로 나열) */}
        <FilterPanel
          selectedRealms={selectedRealms}
          onRealmsChange={handleRealmsChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </header>

      {/* ── 메인 콘텐츠 (지도 + 사이드패널) ── */}
      <main className="flex-1 relative overflow-hidden flex">
        {/* 지도 영역 */}
        <div className="flex-1 relative">
          <MapView
            onMapReady={handleMapReady}
            onBoundsChanged={handleBoundsChanged}
            markers={viewMode === 'marker' ? markers : []}
            heatmapData={viewMode === 'heatmap' ? markers : []}
            onMarkerClick={(marker) => {
              if (marker.type !== 'school') {
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
          {showLoadingIndicator && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100]">
              <div className="bg-white px-5 py-2.5 rounded-full shadow-lg border border-gray-100 flex items-center gap-2.5">
                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-600 font-medium">데이터 로딩 중...</span>
              </div>
            </div>
          )}

          {/* 지역 통계 (하단 중앙) */}
          <RegionStats stats={regionStats} />

          {/* 히트맵 범례 */}
          {viewMode === 'heatmap' && (
            <div className="absolute bottom-6 left-6 z-[1000] bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-3.5">
              <p className="text-xs font-semibold text-gray-500 mb-2 tracking-wide">학원 밀집도</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-medium">낮음</span>
                <div className="flex rounded-full overflow-hidden h-2.5">
                  {['#60A5FA', '#A78BFA', '#F472B6', '#FBBF24', '#F87171'].map((color) => (
                    <div key={color} className="w-7 h-2.5" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 font-medium">높음</span>
              </div>
            </div>
          )}

          {/* AI 학원 추천 FAB */}
          {!showRecommend && (
            <button
              onClick={() => {
                setShowRecommend(true);
                setSelectedAcademyId(null);
                setShowSchoolDetail(false);
              }}
              className="absolute bottom-6 right-6 z-[1000] bg-gray-900 hover:bg-gray-800 text-white pl-4 pr-5 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 text-sm font-semibold group"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI 추천
            </button>
          )}
        </div>

        {/* ── 사이드 패널 (슬라이드 인) ── */}
        {hasSidePanel && (
          <div className="w-[420px] flex-shrink-0 border-l border-gray-100 bg-white relative z-[1050] animate-slide-in-right overflow-hidden hidden md:block">
            {/* 닫기 버튼 */}
            <button
              onClick={closeAllPanels}
              aria-label="패널 닫기"
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-gray-100 shadow-sm border border-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="h-full overflow-y-auto">
              {/* 학원 상세 */}
              {selectedAcademyId && (
                <AcademyDetail
                  academyId={selectedAcademyId}
                  onClose={() => setSelectedAcademyId(null)}
                  embedded
                />
              )}

              {/* 학교 상세 */}
              {showSchoolDetail && selectedSchool && !selectedAcademyId && (
                <SchoolDetail
                  schoolId={selectedSchool.id}
                  onClose={() => setShowSchoolDetail(false)}
                  embedded
                />
              )}

              {/* AI 추천 */}
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

              {/* 학교 대시보드 (패널 하단) */}
              {selectedSchool && !selectedAcademyId && !showSchoolDetail && !showRecommend && (
                <SchoolDashboard
                  school={selectedSchool}
                  onClose={handleCloseDashboard}
                  onRadiusChange={setSchoolRadius}
                  embedded
                />
              )}
            </div>
          </div>
        )}

        {/* 모바일용 사이드패널 (오버레이) */}
        {hasSidePanel && (
          <div className="md:hidden fixed inset-0 z-[2000] flex flex-col">
            {/* 오버레이 배경 */}
            <div className="flex-1 bg-black/30" onClick={closeAllPanels} />
            {/* 패널 (하단에서 올라옴) */}
            <div className="h-[75vh] bg-white rounded-t-3xl shadow-2xl overflow-y-auto animate-slide-up">
              <div className="sticky top-0 bg-white pt-3 pb-2 px-4 border-b border-gray-100 z-10">
                <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
                <button
                  onClick={closeAllPanels}
                  aria-label="패널 닫기"
                  className="absolute top-3 right-4 p-1.5 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

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
                  school={selectedSchool ? { id: selectedSchool.id, name: selectedSchool.schoolNm, kind: selectedSchool.schoolKind, lat: selectedSchool.latitude, lng: selectedSchool.longitude } : null}
                  onClose={() => setShowRecommend(false)}
                  embedded
                />
              )}
              {selectedSchool && !selectedAcademyId && !showSchoolDetail && !showRecommend && (
                <SchoolDashboard
                  school={selectedSchool}
                  onClose={handleCloseDashboard}
                  onRadiusChange={setSchoolRadius}
                  embedded
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

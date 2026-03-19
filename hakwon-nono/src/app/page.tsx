'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import KakaoMap, { type MapBounds, type MapMarkerData } from '@/components/KakaoMap';
import FilterPanel, { type ViewMode } from '@/components/FilterPanel';
import RegionStats, { type RegionStatsData } from '@/components/RegionStats';
import SchoolSearch, { type SchoolResult } from '@/components/SchoolSearch';
import SchoolDashboard from '@/components/SchoolDashboard';
import { ALL_REALMS } from '@/lib/constants';

export default function Home() {
  // 상태 관리
  const [selectedRealms, setSelectedRealms] = useState<string[]>([...ALL_REALMS]);
  const [viewMode, setViewMode] = useState<ViewMode>('marker');
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStatsData | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolResult | null>(null);
  const [schoolRadius, setSchoolRadius] = useState(2);
  const [isLoadingAcademies, setIsLoadingAcademies] = useState(false);

  // 지도 인스턴스 참조
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const boundsRef = useRef<MapBounds | null>(null);

  // 학원 데이터 로드
  const fetchAcademies = useCallback(
    async (bounds: MapBounds) => {
      setIsLoadingAcademies(true);

      try {
        const realmParam = selectedRealms.length < ALL_REALMS.length
          ? `&realm=${encodeURIComponent(selectedRealms.join(','))}`
          : '';

        const res = await fetch(
          `/api/academies?swLat=${bounds.sw.lat}&swLng=${bounds.sw.lng}&neLat=${bounds.ne.lat}&neLng=${bounds.ne.lng}${realmParam}&limit=500`
        );

        if (!res.ok) throw new Error('데이터 조회 실패');

        const data = await res.json();
        const academies = data.academies || [];

        // 마커 데이터 변환
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

        // 통계 계산
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
      } catch (err) {
        console.error('학원 데이터 조회 오류:', err);
      } finally {
        setIsLoadingAcademies(false);
      }
    },
    [selectedRealms]
  );

  // 지도 바운드 변경 시
  const handleBoundsChanged = useCallback(
    (bounds: MapBounds) => {
      boundsRef.current = bounds;
      fetchAcademies(bounds);
    },
    [fetchAcademies]
  );

  // 지도 준비 완료 시
  const handleMapReady = useCallback((map: kakao.maps.Map) => {
    mapRef.current = map;
  }, []);

  // 학교 선택 시
  const handleSchoolSelect = useCallback((school: SchoolResult) => {
    setSelectedSchool(school);

    // 학교 위치로 지도 이동
    if (school.latitude && school.longitude && mapRef.current) {
      const position = new kakao.maps.LatLng(school.latitude, school.longitude);
      mapRef.current.setCenter(position);
      mapRef.current.setLevel(4); // 줌인
    }
  }, []);

  // 학교 대시보드 닫기
  const handleCloseDashboard = useCallback(() => {
    setSelectedSchool(null);
  }, []);

  // 분야 필터 변경 시 학원 데이터 리로드
  const handleRealmsChange = useCallback(
    (realms: string[]) => {
      setSelectedRealms(realms);
      // 현재 바운드로 다시 조회
      if (boundsRef.current) {
        // 약간의 딜레이를 줘서 상태 업데이트 반영
        setTimeout(() => {
          if (boundsRef.current) {
            fetchAcademies(boundsRef.current);
          }
        }, 100);
      }
    },
    [fetchAcademies]
  );

  return (
    <div className="flex flex-col h-screen">
      {/* 헤더 */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-20 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 hidden sm:inline">
              학원노노
            </span>
          </Link>

          {/* 검색 */}
          <SchoolSearch onSchoolSelect={handleSchoolSelect} />

          {/* 네비게이션 */}
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              전국 현황
            </Link>
            <Link
              href="/compare"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              지역 비교
            </Link>
          </nav>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 relative overflow-hidden">
        {/* 지도 */}
        <KakaoMap
          onMapReady={handleMapReady}
          onBoundsChanged={handleBoundsChanged}
          markers={viewMode === 'marker' ? markers : []}
          onMarkerClick={(marker) => {
            console.log('마커 클릭:', marker);
          }}
          selectedSchoolPosition={
            selectedSchool?.latitude && selectedSchool?.longitude
              ? { lat: selectedSchool.latitude, lng: selectedSchool.longitude }
              : null
          }
          radiusKm={selectedSchool ? schoolRadius : undefined}
        />

        {/* 로딩 인디케이터 */}
        {isLoadingAcademies && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">학원 데이터 로딩 중...</span>
            </div>
          </div>
        )}

        {/* 필터 패널 */}
        <FilterPanel
          selectedRealms={selectedRealms}
          onRealmsChange={handleRealmsChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* 지역 통계 */}
        <RegionStats stats={regionStats} />

        {/* 범례 (히트맵 모드일 때) */}
        {viewMode === 'heatmap' && (
          <div className="absolute bottom-6 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-4 py-3">
            <p className="text-xs font-medium text-gray-600 mb-2">학원 밀집도</p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">낮음</span>
              <div className="flex h-3">
                {['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'].map((color) => (
                  <div
                    key={color}
                    className="w-6 h-3"
                    style={{ backgroundColor: color, opacity: 0.7 }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">높음</span>
            </div>
          </div>
        )}

        {/* 학교 대시보드 (선택 시 슬라이드 인) */}
        {selectedSchool && (
          <SchoolDashboard
            school={selectedSchool}
            onClose={handleCloseDashboard}
            onRadiusChange={setSchoolRadius}
          />
        )}
      </main>

      {/* 푸터 */}
      <footer className="flex-shrink-0 h-8 bg-gray-50 border-t border-gray-200 flex items-center justify-center px-4">
        <p className="text-xs text-gray-400">
          교육 공공데이터 활용 | 나이스 교육정보 개방포털 | 제8회 교육 공공데이터 AI활용대회 출품작
        </p>
      </footer>
    </div>
  );
}

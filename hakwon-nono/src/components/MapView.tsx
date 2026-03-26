'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { DEFAULT_CENTER, DEFAULT_ZOOM_LEVEL, REALM_COLORS } from '@/lib/constants';

/** 지도 바운드 좌표 */
export interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

/** 마커 데이터 */
export interface MapMarkerData {
  id: string;
  lat: number;
  lng: number;
  name: string;
  realm?: string;
  type?: 'academy' | 'school';
}

interface MapViewProps {
  onMapReady?: (map: unknown) => void;
  onBoundsChanged?: (bounds: MapBounds) => void;
  markers?: MapMarkerData[];
  heatmapData?: MapMarkerData[];
  onMarkerClick?: (marker: MapMarkerData) => void;
  selectedSchoolPosition?: { lat: number; lng: number } | null;
  radiusKm?: number;
  onSchoolMarkerClick?: () => void;
}

// Leaflet 줌 레벨 변환 (카카오 레벨 8 → Leaflet 약 7)
const kakaoToLeafletZoom = (kakaoLevel: number) => Math.max(1, 14 - kakaoLevel);

// XSS 방지를 위한 HTML 이스케이프 헬퍼
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function MapView({
  onMapReady,
  onBoundsChanged,
  markers = [],
  heatmapData = [],
  onMarkerClick,
  selectedSchoolPosition,
  radiusKm,
  onSchoolMarkerClick,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const schoolMarkerRef = useRef<L.Marker | null>(null);
  const lastSchoolPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [heatPluginReady, setHeatPluginReady] = useState(false);
  const leafletLoadedRef = useRef(false);

  // 디바운스된 바운드 변경 핸들러
  const handleBoundsChanged = useCallback(() => {
    if (!mapInstanceRef.current || !onBoundsChanged) return;

    if (boundsTimerRef.current) {
      clearTimeout(boundsTimerRef.current);
    }

    boundsTimerRef.current = setTimeout(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      onBoundsChanged({
        sw: { lat: sw.lat, lng: sw.lng },
        ne: { lat: ne.lat, lng: ne.lng },
      });
    }, 300);
  }, [onBoundsChanged]);

  // Leaflet 초기화
  useEffect(() => {
    if (leafletLoadedRef.current) return;
    leafletLoadedRef.current = true;

    // Leaflet CSS 동적 로드
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Leaflet JS 동적 로드
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      // MarkerCluster CSS
      const clusterCss = document.createElement('link');
      clusterCss.rel = 'stylesheet';
      clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
      document.head.appendChild(clusterCss);

      const clusterDefaultCss = document.createElement('link');
      clusterDefaultCss.rel = 'stylesheet';
      clusterDefaultCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
      document.head.appendChild(clusterDefaultCss);

      // MarkerCluster JS
      const clusterScript = document.createElement('script');
      clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
      clusterScript.onload = () => {
        // Leaflet.heat JS (히트맵 플러그인)
        const heatScript = document.createElement('script');
        heatScript.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
        heatScript.onload = () => {
          setHeatPluginReady(true);
          initializeMap();
        };
        heatScript.onerror = () => {
          // 히트맵 플러그인 로드 실패해도 지도는 초기화
          console.warn('leaflet.heat 로드 실패 - 히트맵 기능 비활성화');
          initializeMap();
        };
        document.head.appendChild(heatScript);
      };
      document.head.appendChild(clusterScript);
    };
    document.head.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || !window.L) return;

    const L = window.L;
    const map = L.map(mapContainerRef.current, {
      center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
      zoom: kakaoToLeafletZoom(DEFAULT_ZOOM_LEVEL),
      zoomControl: true,
    });

    // OpenStreetMap 타일 레이어
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // 사용자 현재 위치로 이동
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 13);

          // 현재 위치 마커 표시
          const locationIcon = L.divIcon({
            html: `<div style="
              width:16px;height:16px;
              background:#3B82F6;
              border:3px solid white;
              border-radius:50%;
              box-shadow:0 0 0 3px rgba(59,130,246,0.3), 0 2px 4px rgba(0,0,0,0.3);
            "></div>`,
            className: 'current-location-marker',
            iconSize: L.point(16, 16),
            iconAnchor: L.point(8, 8),
          });
          L.marker([latitude, longitude], { icon: locationIcon, zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup('<strong>현재 위치</strong>');
        },
        () => {
          // 위치 권한 거부 시 기본 위치(서울) 유지
          console.log('위치 권한이 거부되어 기본 위치를 사용합니다.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 600000 }
      );
    }

    mapInstanceRef.current = map;

    // 마커 클러스터 그룹 초기화
    markerLayerRef.current = L.markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster: { getChildCount: () => number }) => {
        const count = cluster.getChildCount();
        let size = 40;
        let bgColor = 'rgba(59, 130, 246, 0.8)';

        if (count >= 100) {
          size = 60;
          bgColor = 'rgba(236, 72, 153, 0.8)';
        } else if (count >= 50) {
          size = 50;
          bgColor = 'rgba(139, 92, 246, 0.8)';
        }

        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:${bgColor};
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-weight:bold;font-size:${size > 50 ? 16 : 14}px;
          ">${count}</div>`,
          className: 'marker-cluster-custom',
          iconSize: L.point(size, size),
        });
      },
    });
    if (markerLayerRef.current) {
      map.addLayer(markerLayerRef.current);
    }

    // 이벤트 등록
    map.on('moveend', handleBoundsChanged);
    map.on('zoomend', handleBoundsChanged);

    setIsLoaded(true);
    onMapReady?.(map);
    handleBoundsChanged();
  }, [handleBoundsChanged, onMapReady]);

  // 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerRef.current || !isLoaded || !window.L) return;

    const L = window.L;

    // 기존 마커 제거
    markerLayerRef.current.clearLayers();

    // 새 마커 생성
    markers.forEach((markerData) => {
      const color = markerData.realm ? (REALM_COLORS[markerData.realm] || '#6B7280') : '#3B82F6';
      const size = markerData.type === 'school' ? 28 : 20;

      // SVG 아이콘
      const svgHtml = markerData.type === 'school'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="4" fill="${color}" stroke="white" stroke-width="2"/><text x="${size / 2}" y="${size * 0.64}" text-anchor="middle" fill="white" font-size="14" font-weight="bold">S</text></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="2"/></svg>`;

      const icon = L.divIcon({
        html: svgHtml,
        className: 'custom-marker',
        iconSize: L.point(size, size),
        iconAnchor: L.point(size / 2, size / 2),
      });

      const marker = L.marker([markerData.lat, markerData.lng], { icon });

      // 팝업
      const popupContent = `
        <div style="padding:4px 8px;font-size:13px;min-width:150px;line-height:1.5;">
          <strong style="font-size:14px;">${escapeHtml(markerData.name)}</strong>
          ${markerData.realm ? `<br/><span style="color:${color};font-size:12px;">${escapeHtml(markerData.realm)}</span>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent);

      // 클릭 이벤트
      marker.on('click', () => {
        onMarkerClick?.(markerData);
      });

      markerLayerRef.current!.addLayer(marker);
    });
  }, [markers, isLoaded, onMarkerClick]);

  // 히트맵 레이어 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !window.L) return;

    // 기존 히트맵 레이어 제거
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // 히트맵 데이터가 있고 플러그인이 준비된 경우에만 렌더링
    if (heatmapData.length > 0 && heatPluginReady && (window.L as unknown as Record<string, unknown>).heatLayer) {
      const heatPoints = heatmapData.map((d) => [d.lat, d.lng, 0.5]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const heatLayer = (window.L as any).heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.2: '#3B82F6',
          0.4: '#8B5CF6',
          0.6: '#EC4899',
          0.8: '#F59E0B',
          1.0: '#EF4444',
        },
      });
      heatLayer.addTo(mapInstanceRef.current);
      heatLayerRef.current = heatLayer;
    }
  }, [heatmapData, isLoaded, heatPluginReady]);

  // 선택된 학교 주변 반경 원 표시
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !window.L) return;

    const L = window.L;

    // 기존 원 제거
    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    if (selectedSchoolPosition && radiusKm) {
      const circle = L.circle(
        [selectedSchoolPosition.lat, selectedSchoolPosition.lng],
        {
          radius: radiusKm * 1000,
          color: '#3B82F6',
          weight: 2,
          opacity: 0.8,
          dashArray: '8, 4',
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
        }
      ).addTo(mapInstanceRef.current);

      circleRef.current = circle;
    }
  }, [selectedSchoolPosition, radiusKm, isLoaded]);

  // 선택된 학교 마커 표시 + 지도 이동 (🏫 아이콘)
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    // 기존 학교 마커 제거
    if (schoolMarkerRef.current) {
      schoolMarkerRef.current.remove();
      schoolMarkerRef.current = null;
    }

    if (selectedSchoolPosition) {
      const schoolIcon = L.divIcon({
        className: 'school-marker',
        html: '<div style="background:#4338ca;color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🏫</div>',
        iconSize: L.point(40, 40),
        iconAnchor: L.point(20, 20),
      });

      const marker = L.marker(
        [selectedSchoolPosition.lat, selectedSchoolPosition.lng],
        { icon: schoolIcon, zIndexOffset: 2000 }
      ).addTo(map);

      marker.on('click', () => {
        onSchoolMarkerClick?.();
      });

      schoolMarkerRef.current = marker;

      // 학교 위치로 지도 이동 + 확대 (새 학교 선택 시에만)
      const lastPos = lastSchoolPosRef.current;
      if (!lastPos || lastPos.lat !== selectedSchoolPosition.lat || lastPos.lng !== selectedSchoolPosition.lng) {
        map.setView(
          [selectedSchoolPosition.lat, selectedSchoolPosition.lng],
          16,
        );
        lastSchoolPosRef.current = selectedSchoolPosition;
      }
    } else {
      lastSchoolPosRef.current = null;
    }
  }, [selectedSchoolPosition, isLoaded, onSchoolMarkerClick]);

  // 클린업
  useEffect(() => {
    return () => {
      if (boundsTimerRef.current) {
        clearTimeout(boundsTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* 지도 컨테이너 */}
      <div ref={mapContainerRef} className="w-full h-full relative">
        {/* 로딩 상태 */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-[1000]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">지도를 불러오는 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 커스텀 마커 스타일 */}
      <style jsx global>{`
        .custom-marker {
          background: none !important;
          border: none !important;
        }
        .marker-cluster-custom {
          background: none !important;
          border: none !important;
        }
        .school-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </>
  );
}

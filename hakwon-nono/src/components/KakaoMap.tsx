'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Script from 'next/script';
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

interface KakaoMapProps {
  onMapReady?: (map: kakao.maps.Map) => void;
  onBoundsChanged?: (bounds: MapBounds) => void;
  markers?: MapMarkerData[];
  onMarkerClick?: (marker: MapMarkerData) => void;
  selectedSchoolPosition?: { lat: number; lng: number } | null;
  radiusKm?: number;
}

export default function KakaoMap({
  onMapReady,
  onBoundsChanged,
  markers = [],
  onMarkerClick,
  selectedSchoolPosition,
  radiusKm,
}: KakaoMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<kakao.maps.Marker[]>([]);
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);
  const circleRef = useRef<kakao.maps.Circle | null>(null);
  const infoWindowRef = useRef<kakao.maps.InfoWindow | null>(null);
  const boundsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
        sw: { lat: sw.getLat(), lng: sw.getLng() },
        ne: { lat: ne.getLat(), lng: ne.getLng() },
      });
    }, 300);
  }, [onBoundsChanged]);

  // 카카오맵 SDK 로드 완료 시 지도 초기화
  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || !window.kakao?.maps) return;

    window.kakao.maps.load(() => {
      const container = mapContainerRef.current;
      if (!container) return;

      const options: kakao.maps.MapOptions = {
        center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        level: DEFAULT_ZOOM_LEVEL,
      };

      const map = new kakao.maps.Map(container, options);
      mapInstanceRef.current = map;

      // 줌 컨트롤 추가
      const zoomControl = new (kakao.maps as unknown as Record<string, new () => unknown>).ZoomControl();
      map.addControl(zoomControl as never, (kakao.maps as unknown as Record<string, Record<string, unknown>>).ControlPosition.RIGHT);

      // 지도 타입 컨트롤 추가
      const mapTypeControl = new (kakao.maps as unknown as Record<string, new () => unknown>).MapTypeControl();
      map.addControl(mapTypeControl as never, (kakao.maps as unknown as Record<string, Record<string, unknown>>).ControlPosition.TOPRIGHT);

      // 마커 클러스터러 초기화
      clustererRef.current = new kakao.maps.MarkerClusterer({
        map: map,
        averageCenter: true,
        minLevel: 5,
        gridSize: 60,
        minClusterSize: 3,
        styles: [
          {
            width: '40px',
            height: '40px',
            background: 'rgba(59, 130, 246, 0.8)',
            borderRadius: '50%',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 'bold',
            lineHeight: '40px',
            fontSize: '14px',
          },
          {
            width: '50px',
            height: '50px',
            background: 'rgba(139, 92, 246, 0.8)',
            borderRadius: '50%',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 'bold',
            lineHeight: '50px',
            fontSize: '15px',
          },
          {
            width: '60px',
            height: '60px',
            background: 'rgba(236, 72, 153, 0.8)',
            borderRadius: '50%',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 'bold',
            lineHeight: '60px',
            fontSize: '16px',
          },
        ],
        calculator: [10, 50, 100],
      });

      // 이벤트 등록
      kakao.maps.event.addListener(map, 'idle', handleBoundsChanged);

      setIsLoaded(true);

      // 콜백 호출
      onMapReady?.(map);

      // 초기 바운드 전달
      handleBoundsChanged();
    });
  }, [handleBoundsChanged, onMapReady]);

  // 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !clustererRef.current || !isLoaded) return;

    // 기존 인포윈도우 닫기
    infoWindowRef.current?.close();

    // 기존 마커 제거
    clustererRef.current.clear();
    markersRef.current = [];

    // 새 마커 생성
    const newMarkers = markers.map((markerData) => {
      const position = new kakao.maps.LatLng(markerData.lat, markerData.lng);

      // 분야별 색상으로 마커 이미지 생성
      const color = markerData.realm ? (REALM_COLORS[markerData.realm] || '#6B7280') : '#3B82F6';
      const markerSize = markerData.type === 'school' ? new kakao.maps.Size(28, 28) : new kakao.maps.Size(20, 20);

      // SVG 마커 이미지
      const svgContent = markerData.type === 'school'
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect x="2" y="2" width="24" height="24" rx="4" fill="${color}" stroke="white" stroke-width="2"/><text x="14" y="18" text-anchor="middle" fill="white" font-size="14" font-weight="bold">S</text></svg>`
          )}`
        : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="${color}" stroke="white" stroke-width="2"/></svg>`
          )}`;

      const markerImage = new kakao.maps.MarkerImage(svgContent, markerSize);

      const marker = new kakao.maps.Marker({
        position,
        image: markerImage,
        title: markerData.name,
        clickable: true,
      });

      // 마커 클릭 이벤트
      kakao.maps.event.addListener(marker, 'click', () => {
        // 인포윈도우 표시
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }

        const infoWindow = new kakao.maps.InfoWindow({
          content: `
            <div style="padding:8px 12px;font-size:13px;min-width:150px;line-height:1.5;">
              <strong style="font-size:14px;">${markerData.name}</strong>
              ${markerData.realm ? `<br/><span style="color:${color};font-size:12px;">${markerData.realm}</span>` : ''}
            </div>
          `,
        });
        infoWindow.open(mapInstanceRef.current!, marker);
        infoWindowRef.current = infoWindow;

        onMarkerClick?.(markerData);
      });

      return marker;
    });

    markersRef.current = newMarkers;
    clustererRef.current.addMarkers(newMarkers);
  }, [markers, isLoaded, onMarkerClick]);

  // 선택된 학교 주변 반경 원 표시
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // 기존 원 제거
    circleRef.current?.setMap(null);
    circleRef.current = null;

    if (selectedSchoolPosition && radiusKm) {
      const circle = new kakao.maps.Circle({
        center: new kakao.maps.LatLng(selectedSchoolPosition.lat, selectedSchoolPosition.lng),
        radius: radiusKm * 1000, // km → m 변환
        strokeWeight: 2,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeStyle: 'dashed',
        fillColor: '#3B82F6',
        fillOpacity: 0.1,
        map: mapInstanceRef.current,
      });
      circleRef.current = circle;

      // 원 범위에 맞춰 지도 이동
      const bounds = circle.getBounds();
      mapInstanceRef.current.setBounds(bounds);
    }
  }, [selectedSchoolPosition, radiusKm, isLoaded]);

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
      {/* 카카오맵 SDK 로드 */}
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_APP_KEY}&libraries=services,clusterer&autoload=false`}
        strategy="afterInteractive"
        onLoad={initializeMap}
      />

      {/* 지도 컨테이너 */}
      <div ref={mapContainerRef} className="w-full h-full relative">
        {/* 로딩 상태 */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">지도를 불러오는 중...</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

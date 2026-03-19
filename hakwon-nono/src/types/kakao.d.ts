// 카카오맵 SDK TypeScript 선언 파일

declare namespace kakao.maps {
  // 지도 객체
  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getLevel(): number;
    setMapTypeId(mapTypeId: MapTypeId): void;
    getMapTypeId(): MapTypeId;
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
    getBounds(): LatLngBounds;
    setDraggable(draggable: boolean): void;
    setZoomable(zoomable: boolean): void;
    relayout(): void;
    panTo(latlng: LatLng): void;
    addControl(control: unknown, position: unknown): void;
    removeControl(control: unknown): void;
    addOverlayMapTypeId(mapTypeId: MapTypeId): void;
    removeOverlayMapTypeId(mapTypeId: MapTypeId): void;
    setKeyboardShortcuts(shortcuts: boolean): void;
    getProjection(): MapProjection;
  }

  // 지도 옵션
  interface MapOptions {
    center: LatLng;
    level?: number;
    mapTypeId?: MapTypeId;
    draggable?: boolean;
    scrollwheel?: boolean;
    disableDoubleClick?: boolean;
    disableDoubleClickZoom?: boolean;
    projectionId?: string;
    tileAnimation?: boolean;
    keyboardShortcuts?: boolean;
  }

  // 지도 타입
  enum MapTypeId {
    ROADMAP = 1,
    SKYVIEW = 2,
    HYBRID = 3,
  }

  // 위도 경도 좌표
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
    equals(latlng: LatLng): boolean;
    toString(): string;
  }

  // 좌표 범위 (바운드)
  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng);
    extend(latlng: LatLng): void;
    contain(latlng: LatLng): boolean;
    isEmpty(): boolean;
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
    toString(): string;
  }

  // 마커
  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getMap(): Map | null;
    setImage(image: MarkerImage): void;
    getImage(): MarkerImage;
    setPosition(position: LatLng): void;
    getPosition(): LatLng;
    setZIndex(zIndex: number): void;
    getZIndex(): number;
    setVisible(visible: boolean): void;
    getVisible(): boolean;
    setTitle(title: string): void;
    getTitle(): string;
    setDraggable(draggable: boolean): void;
    getDraggable(): boolean;
    setClickable(clickable: boolean): void;
    getClickable(): boolean;
    setOpacity(opacity: number): void;
    getOpacity(): number;
  }

  // 마커 옵션
  interface MarkerOptions {
    map?: Map;
    position: LatLng;
    image?: MarkerImage;
    title?: string;
    draggable?: boolean;
    clickable?: boolean;
    zIndex?: number;
    opacity?: number;
    altitude?: number;
    range?: number;
  }

  // 마커 이미지
  class MarkerImage {
    constructor(
      src: string,
      size: Size,
      options?: {
        alt?: string;
        coords?: string;
        offset?: Point;
        shape?: string;
        spriteOrigin?: Point;
        spriteSize?: Size;
      }
    );
  }

  // 인포윈도우
  class InfoWindow {
    constructor(options: InfoWindowOptions);
    open(map: Map, marker?: Marker): void;
    close(): void;
    getMap(): Map | null;
    setPosition(position: LatLng): void;
    getPosition(): LatLng;
    setContent(content: string | HTMLElement): void;
    getContent(): string;
    setZIndex(zIndex: number): void;
    getZIndex(): number;
  }

  // 인포윈도우 옵션
  interface InfoWindowOptions {
    content?: string | HTMLElement;
    disableAutoPan?: boolean;
    map?: Map;
    position?: LatLng;
    removable?: boolean;
    zIndex?: number;
    altitude?: number;
    range?: number;
  }

  // 커스텀 오버레이
  class CustomOverlay {
    constructor(options: CustomOverlayOptions);
    setMap(map: Map | null): void;
    getMap(): Map | null;
    setPosition(position: LatLng): void;
    getPosition(): LatLng;
    setContent(content: string | HTMLElement): void;
    getContent(): string;
    setVisible(visible: boolean): void;
    getVisible(): boolean;
    setZIndex(zIndex: number): void;
    getZIndex(): number;
  }

  // 커스텀 오버레이 옵션
  interface CustomOverlayOptions {
    clickable?: boolean;
    content?: string | HTMLElement;
    map?: Map;
    position?: LatLng;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }

  // 마커 클러스터러
  class MarkerClusterer {
    constructor(options: MarkerClustererOptions);
    addMarker(marker: Marker, nodraw?: boolean): void;
    addMarkers(markers: Marker[], nodraw?: boolean): void;
    removeMarker(marker: Marker, nodraw?: boolean): void;
    removeMarkers(markers: Marker[], nodraw?: boolean): void;
    clear(): void;
    redraw(): void;
    getGridSize(): number;
    setGridSize(size: number): void;
    getMinClusterSize(): number;
    setMinClusterSize(size: number): void;
    getAverageCenter(): boolean;
    setAverageCenter(bool: boolean): void;
    getMinLevel(): number;
    setMinLevel(level: number): void;
    getTexts(): string[];
    setTexts(texts: string[]): void;
    getCalculator(): number[] | ((size: number) => number);
    setCalculator(calculator: number[] | ((size: number) => number)): void;
    getStyles(): object[];
    setStyles(styles: object[]): void;
  }

  // 마커 클러스터러 옵션
  interface MarkerClustererOptions {
    map?: Map;
    markers?: Marker[];
    gridSize?: number;
    averageCenter?: boolean;
    minLevel?: number;
    minClusterSize?: number;
    styles?: object[];
    texts?: string[] | ((size: number) => string);
    calculator?: number[] | ((size: number) => number);
    disableClickZoom?: boolean;
  }

  // 크기
  class Size {
    constructor(width: number, height: number);
    equals(size: Size): boolean;
    toString(): string;
  }

  // 포인트
  class Point {
    constructor(x: number, y: number);
    equals(point: Point): boolean;
    toString(): string;
  }

  // 지도 프로젝션
  interface MapProjection {
    pointFromCoords(latlng: LatLng): Point;
    coordsFromPoint(point: Point): LatLng;
    containerPointFromCoords(latlng: LatLng): Point;
    coordsFromContainerPoint(point: Point): LatLng;
  }

  // 원형 오버레이
  class Circle {
    constructor(options: CircleOptions);
    setMap(map: Map | null): void;
    getMap(): Map | null;
    setPosition(position: LatLng): void;
    getPosition(): LatLng;
    setRadius(radius: number): void;
    getRadius(): number;
    getBounds(): LatLngBounds;
  }

  // 원형 오버레이 옵션
  interface CircleOptions {
    center: LatLng;
    radius: number;
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
    fillColor?: string;
    fillOpacity?: number;
    map?: Map;
  }

  // 이벤트
  namespace event {
    function addListener(
      target: Map | Marker | MarkerClusterer | InfoWindow | CustomOverlay,
      type: string,
      handler: (...args: unknown[]) => void
    ): void;
    function removeListener(
      target: Map | Marker | MarkerClusterer | InfoWindow | CustomOverlay,
      type: string,
      handler: (...args: unknown[]) => void
    ): void;
    function trigger(
      target: Map | Marker | MarkerClusterer | InfoWindow | CustomOverlay,
      type: string,
      data?: unknown
    ): void;
  }

  // 장소 검색 서비스
  namespace services {
    // 장소 검색
    class Places {
      constructor(map?: Map);
      keywordSearch(
        keyword: string,
        callback: (result: PlacesSearchResult[], status: Status, pagination: Pagination) => void,
        options?: PlacesSearchOptions
      ): void;
      categorySearch(
        category: string,
        callback: (result: PlacesSearchResult[], status: Status, pagination: Pagination) => void,
        options?: PlacesSearchOptions
      ): void;
    }

    // 주소 검색 (지오코더)
    class Geocoder {
      constructor();
      addressSearch(
        addr: string,
        callback: (result: GeocoderResult[], status: Status) => void,
        options?: { page?: number; size?: number }
      ): void;
      coord2Address(
        x: number,
        y: number,
        callback: (result: Coord2AddressResult[], status: Status) => void,
        options?: { input_coord?: Coords }
      ): void;
      coord2RegionCode(
        x: number,
        y: number,
        callback: (result: RegionCodeResult[], status: Status) => void,
        options?: { input_coord?: Coords }
      ): void;
    }

    // 좌표계 타입
    type Coords = 'WGS84' | 'WCONGNAMUL' | 'CONGNAMUL' | 'WTM' | 'TM';

    // 검색 상태
    enum Status {
      OK = 'OK',
      ZERO_RESULT = 'ZERO_RESULT',
      ERROR = 'ERROR',
    }

    // 검색 결과
    interface PlacesSearchResult {
      id: string;
      place_name: string;
      category_name: string;
      category_group_code: string;
      category_group_name: string;
      phone: string;
      address_name: string;
      road_address_name: string;
      x: string;
      y: string;
      place_url: string;
      distance: string;
    }

    // 검색 옵션
    interface PlacesSearchOptions {
      category_group_code?: string;
      x?: number;
      y?: number;
      radius?: number;
      bounds?: LatLngBounds;
      rect?: string;
      size?: number;
      page?: number;
      sort?: SortBy;
      useMapCenter?: boolean;
      useMapBounds?: boolean;
      location?: LatLng;
    }

    // 정렬 기준
    enum SortBy {
      ACCURACY = 'accuracy',
      DISTANCE = 'distance',
    }

    // 페이지네이션
    interface Pagination {
      totalCount: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      current: number;
      gotoPage(page: number): void;
      gotoFirst(): void;
      gotoLast(): void;
      nextPage(): void;
      prevPage(): void;
    }

    // 지오코더 결과
    interface GeocoderResult {
      address_name: string;
      address_type: string;
      x: string;
      y: string;
      address: {
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
        mountain_yn: string;
        main_address_no: string;
        sub_address_no: string;
      };
      road_address: {
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
        road_name: string;
        underground_yn: string;
        main_building_no: string;
        sub_building_no: string;
        building_name: string;
        zone_no: string;
      } | null;
    }

    // 좌표→주소 변환 결과
    interface Coord2AddressResult {
      address: {
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
        mountain_yn: string;
        main_address_no: string;
        sub_address_no: string;
      };
      road_address: {
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
        road_name: string;
        underground_yn: string;
        main_building_no: string;
        sub_building_no: string;
        building_name: string;
        zone_no: string;
      } | null;
    }

    // 좌표→행정구역 변환 결과
    interface RegionCodeResult {
      region_type: string;
      code: string;
      address_name: string;
      region_1depth_name: string;
      region_2depth_name: string;
      region_3depth_name: string;
      region_4depth_name: string;
      x: number;
      y: number;
    }
  }

  // 지도 로드 함수
  function load(callback: () => void): void;
}

// Window 인터페이스 확장 - 카카오맵 SDK 글로벌 접근
interface Window {
  kakao: typeof kakao;
}

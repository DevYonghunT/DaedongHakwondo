"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map } from "maplibre-gl";
import { X } from "lucide-react";
import { RiskBadge } from "@/components/RiskBadge";
import { RISK_COLORS, RISK_LABELS, RESOURCE_LABELS, WALKING_30_MIN_LABEL } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatWon } from "@/lib/tuition";
import type { Academy, AreaScore, LearningResource, RiskType, School } from "@/lib/types";

type SafetyMapProps = {
  areas: AreaScore[];
  schools: School[];
  academies: Academy[];
  learningResources: LearningResource[];
  selectedSchoolId: string;
  selectedSchool: School | null;
  onSelectSchool: (schoolId: string) => void;
};

type MapSelection =
  | {
      type: "area";
      label: string;
      score: number;
      risk: RiskType;
      registeredAcademyCount: number;
      publicResourceCount: number;
    }
  | { type: "school"; school: School }
  | { type: "academy"; academy: Academy }
  | { type: "resource"; resource: LearningResource };

function areasToGeoJson(areas: AreaScore[], selectedSchoolId: string) {
  return {
    type: "FeatureCollection" as const,
    features: areas.map((area) => ({
      type: "Feature" as const,
      properties: {
        id: area.id,
        label: area.label,
        score: area.score,
        riskType: area.risk,
        risk: RISK_LABELS[area.risk],
        color: RISK_COLORS[area.risk],
        selected: area.id.includes(selectedSchoolId),
        registeredAcademyCount: area.evidence.registeredAcademyCount,
        publicResourceCount: area.evidence.publicResourceCount
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [area.polygon.map((point) => [point.lng, point.lat])]
      }
    }))
  };
}

export function SafetyMap({
  areas,
  schools,
  academies,
  learningResources,
  selectedSchoolId,
  selectedSchool: selectedReportSchool,
  onSelectSchool
}: SafetyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerCleanupRef = useRef<(() => void)[]>([]);
  const [mapError, setMapError] = useState("");
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const areaGeoJson = useMemo(() => areasToGeoJson(areas, selectedSchoolId), [areas, selectedSchoolId]);
  const selectedSchool =
    selectedReportSchool ?? schools.find((entry) => entry.id === selectedSchoolId);
  const initialCenterRef = useRef<[number, number]>(
    selectedSchool
      ? [selectedSchool.coordinate.lng, selectedSchool.coordinate.lat]
      : [127.0635, 37.4942]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        center: initialCenterRef.current,
        zoom: 12.5,
        attributionControl: false,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "OpenStreetMap"
            }
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
              paint: {
                "raster-saturation": -0.55,
                "raster-contrast": -0.12,
                "raster-opacity": 0.9
              }
            }
          ]
        }
      });
    } catch (error) {
      setMapError(error instanceof Error ? error.message : "지도를 초기화하지 못했습니다.");
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("error", (event) => {
      if (event.error?.message) {
        setMapError(event.error.message);
      }
    });

    map.on("load", () => {
      map.addSource("areas", {
        type: "geojson",
        data: areaGeoJson
      });

      map.addLayer({
        id: "areas-fill",
        type: "fill",
        source: "areas",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": ["case", ["get", "selected"], 0.24, 0.12]
        }
      });

      map.addLayer({
        id: "areas-line",
        type: "line",
        source: "areas",
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["case", ["get", "selected"], 3, 1.4]
        }
      });

      map.on("click", "areas-fill", (event) => {
        const feature = event.features?.[0];
        if (!feature?.properties) {
          return;
        }

        const properties = feature.properties as {
          label?: string;
          score?: number;
          riskType?: RiskType;
          registeredAcademyCount?: number;
          publicResourceCount?: number;
        };

        if (!properties.label || !properties.riskType) {
          return;
        }

        setSelection({
          type: "area",
          label: properties.label,
          score: Number(properties.score ?? 0),
          risk: properties.riskType,
          registeredAcademyCount: Number(properties.registeredAcademyCount ?? 0),
          publicResourceCount: Number(properties.publicResourceCount ?? 0)
        });
      });

      map.on("mouseenter", "areas-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "areas-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    mapRef.current = map;

    return () => {
      markerCleanupRef.current.forEach((cleanup) => cleanup());
      markerCleanupRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [areaGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) {
      return;
    }

    const source = map.getSource("areas") as GeoJSONSource | undefined;
    source?.setData(areaGeoJson);
  }, [areaGeoJson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markerCleanupRef.current.forEach((cleanup) => cleanup());
    markerCleanupRef.current = [];

    const markers: maplibregl.Marker[] = [];

    for (const school of schools) {
      const element = document.createElement("button");
      element.type = "button";
      element.className =
        school.id === selectedSchoolId
          ? "size-8 rounded-full border-2 border-white bg-sky-500 text-white shadow-md"
          : "size-7 rounded-full border-2 border-white bg-sky-300 text-slate-800 shadow-sm";
      element.setAttribute("aria-label", `${school.name} 선택`);
      element.textContent = "학";
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelection({ type: "school", school });
        onSelectSchool(school.id);
      });

      const marker = new maplibregl.Marker({ element })
        .setLngLat([school.coordinate.lng, school.coordinate.lat])
        .addTo(map);
      markers.push(marker);
    }

    if (selectedSchool && !schools.some((school) => school.id === selectedSchool.id)) {
      const element = document.createElement("button");
      element.type = "button";
      element.className =
        "size-8 rounded-full border-2 border-white bg-sky-500 text-white shadow-md";
      element.setAttribute("aria-label", `${selectedSchool.name} 선택`);
      element.textContent = "학";
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelection({ type: "school", school: selectedSchool });
      });

      markers.push(
        new maplibregl.Marker({ element })
          .setLngLat([selectedSchool.coordinate.lng, selectedSchool.coordinate.lat])
          .addTo(map)
      );
    }

    for (const resource of learningResources) {
      const element = document.createElement("button");
      element.type = "button";
      element.className =
        "size-4 rounded-full border-2 border-white bg-emerald-400 shadow-sm outline-none hover:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";
      element.setAttribute("aria-label", `${resource.name} 보기`);
      element.title = resource.name;
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelection({ type: "resource", resource });
      });

      markers.push(
        new maplibregl.Marker({ element })
          .setLngLat([resource.coordinate.lng, resource.coordinate.lat])
          .addTo(map)
      );
    }

    for (const academy of academies) {
      const element = document.createElement("button");
      element.type = "button";
      element.className =
        academy.status === "등록"
          ? "size-3 rounded-full border border-white bg-amber-400 shadow-sm outline-none hover:bg-amber-500 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          : "size-3 rounded-full border border-white bg-slate-300 shadow-sm outline-none hover:bg-slate-400 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";
      element.setAttribute("aria-label", `${academy.name} 보기`);
      element.title = academy.name;
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelection({ type: "academy", academy });
      });

      markers.push(
        new maplibregl.Marker({ element })
          .setLngLat([academy.coordinate.lng, academy.coordinate.lat])
          .addTo(map)
      );
    }

    markerCleanupRef.current = markers.map((marker) => () => marker.remove());
  }, [academies, learningResources, onSelectSchool, schools, selectedSchool, selectedSchoolId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedSchool) {
      return;
    }

    map.easeTo({
      center: [selectedSchool.coordinate.lng, selectedSchool.coordinate.lat],
      zoom: 13,
      duration: 160
    });
  }, [selectedSchool]);

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-sky-100 bg-sky-50 shadow-sm">
      <div ref={containerRef} className="absolute inset-0 z-map" />
      {mapError ? (
        <div className="absolute inset-0 z-overlay flex items-center justify-center bg-sky-50 p-6">
          <div className="max-w-md rounded-lg border border-sky-100 bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-950">지도 엔진을 사용할 수 없습니다</p>
            <p className="mt-2 text-pretty text-sm leading-6 text-slate-600">
              WebGL이 비활성화된 브라우저입니다. 걸어서 30분 점수, 빈틈 분류, 주변 학원
              목록은 오른쪽 리포트와 아래 표에서 계속 확인할 수 있습니다.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              선택 학교: {selectedSchool?.name ?? "미선택"} · 표시 예정 학원{" "}
              {academies.length.toLocaleString("ko-KR")}곳
            </p>
          </div>
        </div>
      ) : null}
      {selection ? (
        <MapSelectionCard selection={selection} onClose={() => setSelection(null)} />
      ) : null}
      <div className="absolute bottom-3 left-3 z-docked rounded-lg border border-sky-100 bg-white p-3 shadow-sm">
        <div className="grid gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-sky-400" />
            학교
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-amber-400" />
            학원
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-emerald-400" />
            무료 배움터
          </div>
        </div>
      </div>
    </div>
  );
}

function MapSelectionCard({
  selection,
  onClose
}: {
  selection: MapSelection;
  onClose: () => void;
}) {
  const eyebrow =
    selection.type === "academy"
      ? "학원"
      : selection.type === "resource"
        ? "무료 배움터"
        : selection.type === "school"
          ? "학교"
          : WALKING_30_MIN_LABEL;

  return (
    <aside className="absolute left-3 right-3 top-3 z-docked rounded-lg border border-sky-100 bg-white p-3 shadow-md sm:left-auto sm:right-3 sm:top-14 sm:w-80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sky-700">{eyebrow}</p>
          <h3 className="mt-1 truncate text-base font-semibold text-slate-950">
            {getSelectionTitle(selection)}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="선택 정보 닫기"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-sky-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3">
        {selection.type === "academy" ? <AcademySelection academy={selection.academy} /> : null}
        {selection.type === "resource" ? <ResourceSelection resource={selection.resource} /> : null}
        {selection.type === "school" ? <SchoolSelection school={selection.school} /> : null}
        {selection.type === "area" ? <AreaSelection selection={selection} /> : null}
      </div>
    </aside>
  );
}

function getSelectionTitle(selection: MapSelection) {
  if (selection.type === "academy") {
    return selection.academy.name;
  }

  if (selection.type === "resource") {
    return selection.resource.name;
  }

  if (selection.type === "school") {
    return selection.school.name;
  }

  return selection.label;
}

function AcademySelection({ academy }: { academy: Academy }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <InfoChip label="과목" value={academy.group || academy.realm || "미분류"} tone="warm" />
        <InfoChip label="운영" value={academy.status} tone={academy.status === "등록" ? "ok" : "muted"} />
        <InfoChip label="월 학원비" value={formatWon(academy.monthlyFee)} />
        <InfoChip label="학원비 표시" value={academy.feeDisclosed ? "공개" : "비공개"} />
      </div>
      <p className="text-pretty rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-5 text-slate-600">
        {academy.subject || academy.course || "과목 정보가 비어 있습니다."}
      </p>
      <p className="truncate text-xs text-slate-500">{academy.address}</p>
    </div>
  );
}

function ResourceSelection({ resource }: { resource: LearningResource }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <InfoChip label="종류" value={RESOURCE_LABELS[resource.type]} tone="ok" />
        <InfoChip label="비용" value={resource.cost == null || resource.cost === 0 ? "무료" : formatWon(resource.cost)} />
        <InfoChip label="대상" value={resource.target || "확인 필요"} />
        <InfoChip label="시간" value={resource.operatingHours || "확인 필요"} />
      </div>
      <p className="truncate text-xs text-slate-500">{resource.address}</p>
    </div>
  );
}

function SchoolSelection({ school }: { school: School }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2">
        <InfoChip label="학교급" value={school.kind} />
        <InfoChip label="학생 수" value={`${school.studentCount.toLocaleString("ko-KR")}명`} />
      </div>
      <p className="truncate text-xs text-slate-500">{school.address}</p>
    </div>
  );
}

function AreaSelection({ selection }: { selection: Extract<MapSelection, { type: "area" }> }) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-100 bg-sky-50 p-3">
        <RiskBadge risk={selection.risk} />
        <span className="text-sm font-semibold tabular-nums text-slate-950">
          {selection.score}/100
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InfoChip label="가까운 학원" value={`${selection.registeredAcademyCount}곳`} />
        <InfoChip label="무료 배움터" value={`${selection.publicResourceCount}곳`} />
      </div>
    </div>
  );
}

function InfoChip({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "muted" | "warm";
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2",
        tone === "ok" && "border-emerald-200 bg-emerald-50",
        tone === "muted" && "border-slate-300 bg-slate-100",
        tone === "warm" && "border-amber-200 bg-amber-50"
      )}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

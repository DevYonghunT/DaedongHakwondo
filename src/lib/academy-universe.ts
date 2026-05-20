import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { importedAcademies } from "@/lib/generated-dump-data";
import type { Academy, LatLng } from "@/lib/types";

type AcademyUniverseData = {
  importedAcademyUniverse?: Academy[];
};

const GRID_SIZE_DEGREES = 0.05;
let cachedAcademies: Academy[] | null = null;
let cachedGrid: Map<string, Academy[]> | null = null;

function cellKey(lat: number, lng: number) {
  return `${Math.floor(lat / GRID_SIZE_DEGREES)}:${Math.floor(lng / GRID_SIZE_DEGREES)}`;
}

export function getAcademyUniverse() {
  if (cachedAcademies) {
    return cachedAcademies;
  }

  const universePath = resolve(process.cwd(), "src/lib/generated-academy-universe.json");
  if (!existsSync(universePath)) {
    cachedAcademies = importedAcademies;
    return cachedAcademies;
  }

  const parsed = JSON.parse(readFileSync(universePath, "utf8")) as AcademyUniverseData;
  cachedAcademies =
    parsed.importedAcademyUniverse && parsed.importedAcademyUniverse.length > 0
      ? parsed.importedAcademyUniverse
      : importedAcademies;

  return cachedAcademies;
}

function getAcademyGrid() {
  if (cachedGrid) {
    return cachedGrid;
  }

  cachedGrid = new Map<string, Academy[]>();
  for (const academy of getAcademyUniverse()) {
    const key = cellKey(academy.coordinate.lat, academy.coordinate.lng);
    cachedGrid.set(key, [...(cachedGrid.get(key) ?? []), academy]);
  }

  return cachedGrid;
}

export function getAcademyCandidates(center: LatLng, radiusKm: number) {
  const grid = getAcademyGrid();
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  const minLatCell = Math.floor((center.lat - latDelta) / GRID_SIZE_DEGREES);
  const maxLatCell = Math.floor((center.lat + latDelta) / GRID_SIZE_DEGREES);
  const minLngCell = Math.floor((center.lng - lngDelta) / GRID_SIZE_DEGREES);
  const maxLngCell = Math.floor((center.lng + lngDelta) / GRID_SIZE_DEGREES);
  const candidates: Academy[] = [];

  for (let latCell = minLatCell; latCell <= maxLatCell; latCell += 1) {
    for (let lngCell = minLngCell; lngCell <= maxLngCell; lngCell += 1) {
      const cellAcademies = grid.get(`${latCell}:${lngCell}`);
      if (cellAcademies) {
        candidates.push(...cellAcademies);
      }
    }
  }

  return candidates;
}

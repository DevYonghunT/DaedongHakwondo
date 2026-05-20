import type { LatLng } from "@/lib/types";

const GRID_METERS = 250;
const LAT_METERS = 111_320;

export function fuzzCoordinate(coordinate: LatLng): LatLng {
  const lngMeters = LAT_METERS * Math.cos((coordinate.lat * Math.PI) / 180);

  return {
    lat: Math.round((coordinate.lat * LAT_METERS) / GRID_METERS) * (GRID_METERS / LAT_METERS),
    lng: Math.round((coordinate.lng * lngMeters) / GRID_METERS) * (GRID_METERS / lngMeters)
  };
}

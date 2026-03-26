-- PostGIS geography 컬럼 추가 마이그레이션
-- 실행 전 PostGIS 확장이 활성화되어 있어야 합니다: CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography columns
ALTER TABLE academies ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);

-- Populate from existing lat/lng
UPDATE academies SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

UPDATE schools SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL;

-- Create GiST indexes
CREATE INDEX IF NOT EXISTS idx_academies_geom ON academies USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_schools_geom ON schools USING GIST(geom);

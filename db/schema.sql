CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE risk_type AS ENUM (
  'PRIVATE_EDUCATION_DESERT',
  'HIGH_COST_HOTSPOT',
  'CHOICE_RICH',
  'PUBLIC_SUPPORT_PRIORITY',
  'BALANCED_WATCH'
);

CREATE TYPE resource_type AS ENUM (
  'LIBRARY',
  'YOUTH_CENTER',
  'PUBLIC_PROGRAM',
  'COUNSELING_CENTER'
);

CREATE TABLE IF NOT EXISTS raw_public_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_endpoint text NOT NULL,
  source_key text NOT NULL,
  payload jsonb NOT NULL,
  collected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_name, source_key)
);

CREATE TABLE IF NOT EXISTS academies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neis_academy_id text NOT NULL,
  education_office_code text NOT NULL,
  name text NOT NULL,
  academy_type text NOT NULL,
  realm text NOT NULL,
  course text,
  subject text,
  capacity integer,
  monthly_fee integer,
  fee_disclosed boolean NOT NULL DEFAULT false,
  address text NOT NULL,
  status text NOT NULL,
  established_at date,
  closed_at date,
  source_updated_at date,
  raw_data jsonb NOT NULL,
  geom geometry(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (neis_academy_id, education_office_code)
);

CREATE INDEX IF NOT EXISTS academies_geom_idx ON academies USING gist (geom);
CREATE INDEX IF NOT EXISTS academies_realm_idx ON academies (realm);
CREATE INDEX IF NOT EXISTS academies_status_idx ON academies (status);

CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  neis_school_id text NOT NULL,
  education_office_code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,
  region text NOT NULL,
  district text NOT NULL,
  address text NOT NULL,
  student_count integer,
  public_support_slots integer NOT NULL DEFAULT 0,
  raw_data jsonb NOT NULL,
  geom geometry(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (neis_school_id, education_office_code)
);

CREATE INDEX IF NOT EXISTS schools_geom_idx ON schools USING gist (geom);
CREATE INDEX IF NOT EXISTS schools_region_idx ON schools (region, district);

CREATE TABLE IF NOT EXISTS learning_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  name text NOT NULL,
  type resource_type NOT NULL,
  region text NOT NULL,
  district text NOT NULL,
  address text NOT NULL,
  capacity integer,
  cost integer,
  operating_hours text,
  target text,
  phone text,
  homepage text,
  tags text[] NOT NULL DEFAULT '{}',
  raw_data jsonb NOT NULL,
  geom geometry(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_resources_geom_idx ON learning_resources USING gist (geom);
CREATE INDEX IF NOT EXISTS learning_resources_type_idx ON learning_resources (type);

CREATE TABLE IF NOT EXISTS transit_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text NOT NULL UNIQUE,
  name text NOT NULL,
  city_code text,
  raw_data jsonb NOT NULL,
  geom geometry(Point, 4326)
);

CREATE INDEX IF NOT EXISTS transit_stops_geom_idx ON transit_stops USING gist (geom);

CREATE TABLE IF NOT EXISTS safety_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  facility_name text NOT NULL,
  facility_type text NOT NULL,
  cctv_installed boolean,
  cctv_count integer,
  road_width text,
  raw_data jsonb NOT NULL,
  geom geometry(Point, 4326)
);

CREATE INDEX IF NOT EXISTS safety_zones_geom_idx ON safety_zones USING gist (geom);

CREATE TABLE IF NOT EXISTS area_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_key text NOT NULL UNIQUE,
  label text NOT NULL,
  region text NOT NULL,
  district text NOT NULL,
  risk risk_type NOT NULL,
  score numeric(5, 2) NOT NULL,
  metrics jsonb NOT NULL,
  evidence jsonb NOT NULL,
  geom geometry(Polygon, 4326),
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS area_scores_geom_idx ON area_scores USING gist (geom);
CREATE INDEX IF NOT EXISTS area_scores_risk_idx ON area_scores (risk);

CREATE TABLE IF NOT EXISTS school_safety_net_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  radius_m integer NOT NULL,
  score numeric(5, 2) NOT NULL,
  risk risk_type NOT NULL,
  metrics jsonb NOT NULL,
  recommendations jsonb NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, radius_m)
);

CREATE TABLE IF NOT EXISTS policy_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  scenario_name text NOT NULL,
  input jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key text NOT NULL UNIQUE,
  report_type text NOT NULL,
  report_content jsonb NOT NULL,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS data_quality_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  severity text NOT NULL,
  issue_type text NOT NULL,
  summary text NOT NULL,
  sample jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

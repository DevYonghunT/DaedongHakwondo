export type RiskType =
  | "PRIVATE_EDUCATION_DESERT"
  | "HIGH_COST_HOTSPOT"
  | "CHOICE_RICH"
  | "PUBLIC_SUPPORT_PRIORITY"
  | "BALANCED_WATCH";

export type ResourceType =
  | "LIBRARY"
  | "YOUTH_CENTER"
  | "PUBLIC_PROGRAM"
  | "COUNSELING_CENTER";

export type LatLng = {
  lat: number;
  lng: number;
};

export type Academy = {
  id: string;
  neisAcademyId: string;
  educationOfficeCode: string;
  name: string;
  academyType: string;
  realm: string;
  group: string;
  course: string;
  subject: string;
  capacity: number | null;
  monthlyFee: number | null;
  feeDisclosed: boolean;
  address: string;
  status: "등록" | "휴원" | "폐원";
  establishedAt: string | null;
  closedAt: string | null;
  sourceUpdatedAt: string;
  coordinate: LatLng;
};

export type School = {
  id: string;
  neisSchoolId: string;
  educationOfficeCode: string;
  name: string;
  kind: string;
  region: string;
  district: string;
  address: string;
  studentCount: number;
  publicSupportSlots: number;
  coordinate: LatLng;
};

export type LearningResource = {
  id: string;
  sourceKey: string;
  name: string;
  type: ResourceType;
  region: string;
  district: string;
  address: string;
  capacity: number | null;
  cost: number | null;
  operatingHours: string;
  target: string;
  phone: string;
  homepage: string;
  tags: string[];
  coordinate: LatLng;
};

export type TransitStop = {
  id: string;
  nodeId: string;
  name: string;
  cityCode: string;
  coordinate: LatLng;
};

export type SafetyZone = {
  id: string;
  sourceKey: string;
  facilityName: string;
  facilityType: string;
  cctvInstalled: boolean;
  cctvCount: number;
  roadWidth: string;
  coordinate: LatLng;
};

export type SafetyMetrics = {
  accessibility: number;
  tuitionRelief: number;
  diversity: number;
  stability: number;
  transit: number;
  commuteSafety: number;
  publicResource: number;
};

export type Evidence = {
  academyCount: number;
  registeredAcademyCount: number;
  closedAcademyCount: number;
  averageMonthlyFee: number | null;
  disclosedFeeRate: number;
  realmCount: number;
  publicResourceCount: number;
  transitStopCount: number;
  safetyZoneCount: number;
};

export type AreaScore = {
  id: string;
  areaKey: string;
  label: string;
  region: string;
  district: string;
  center: LatLng;
  polygon: LatLng[];
  score: number;
  risk: RiskType;
  metrics: SafetyMetrics;
  evidence: Evidence;
  computedAt: string;
};

export type SchoolSafetyNetReport = {
  school: School;
  radiusKm: number;
  score: number;
  risk: RiskType;
  metrics: SafetyMetrics;
  evidence: Evidence;
  nearbyAcademies: Academy[];
  nearbyResources: LearningResource[];
  recommendations: string[];
  dataNotes: string[];
};

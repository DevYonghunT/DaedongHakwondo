"use client";

import * as Tabs from "@radix-ui/react-tabs";
import {
  AlertTriangle,
  Bot,
  Bus,
  Database,
  FileText,
  Landmark,
  Library,
  School as SchoolIcon,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";
import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import { SafetyMap } from "@/components/SafetyMap";
import { ScoreGauge } from "@/components/ScoreGauge";
import {
  RISK_DESCRIPTIONS,
  RISK_LABELS,
  RESOURCE_LABELS,
  WALKING_30_MIN_LABEL,
  WALKING_30_MIN_RADIUS_KM
} from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatWon } from "@/lib/tuition";
import type {
  Academy,
  AreaScore,
  LearningResource,
  School,
  SchoolSafetyNetReport
} from "@/lib/types";

type SafetyNetAppProps = {
  areas: AreaScore[];
  schools: School[];
  learningResources: LearningResource[];
  initialReport: SchoolSafetyNetReport | null;
  dataMode: "imported-dump" | "demo";
  dataMeta: PublicDataMeta;
  initialMapAcademies: Academy[];
  initialSchoolSelector: SchoolDirectoryResult;
};

type PublicDataMeta = {
  source: string;
  importedAt: string;
  totalSchools: number;
  totalAcademies: number;
  selectedSchools: number;
  selectedAcademies: number;
};

type ParentPlanResult = {
  school: School;
  privateOptions: {
    academy: Academy;
    distanceKm: number;
    overBudget: boolean;
    interestMatch: boolean;
  }[];
  publicAlternatives: {
    resource: LearningResource;
    distanceKm: number;
    matchedTags: string[];
  }[];
  costWarnings: string[];
  commuteRisks: string[];
  nextActions: string[];
  privacyNote: string;
};

type SimulationResult = {
  scenarioName: string;
  result: {
    estimatedGapStudents: number;
    reducedStudents: number;
    afterGapStudents: number;
    beforeScore: number;
    afterScore: number;
    recommendedOperation: string;
  };
};

type ProgramType = "MATH_AFTER_SCHOOL" | "PUBLIC_LEARNING_CENTER" | "MENTORING";

type AiReport = {
  title: string;
  summary: string;
  evidenceBullets: string[];
  actions: string[];
  dataLimits: string[];
  generatedBy: string;
};

type DataQuality = {
  generatedAt: string;
  dataMode: "imported-dump" | "demo";
  dataMeta: PublicDataMeta;
  sourceCoverage: Record<string, number>;
  issues: {
    severity: string;
    issueType: string;
    summary: string;
    impact: string;
  }[];
};

type SchoolDirectoryResult = {
  regions: string[];
  districts: string[];
  schools: School[];
  total: number;
  limit: number;
};

const INTERESTS = ["수학", "영어", "코딩", "논술", "예체능"];
const ALL_FILTER = "__ALL__";
const MAX_MAP_ACADEMY_MARKERS = 500;

const metricLabels: Record<keyof SchoolSafetyNetReport["metrics"], string> = {
  accessibility: "가까운 학원",
  tuitionRelief: "학원비 부담",
  diversity: "고를 과목",
  stability: "꾸준히 다닐 곳",
  transit: "버스·지하철",
  commuteSafety: "오가는 길",
  publicResource: "무료 배움터"
};

const coverageLabels: Record<string, string> = {
  schools: "전체 학교",
  analysisSchools: "살펴본 학교",
  academies: "학원",
  learningResources: "무료 배움터",
  safetyZones: "보호구역"
};

const qualityLabels: Record<string, string> = {
  ok: "좋음",
  warning: "확인"
};

type KpiTone = "sky" | "emerald" | "amber" | "rose" | "slate";

function groupSchoolsForSelect(schools: School[]) {
  const groups = new Map<string, School[]>();

  for (const school of schools) {
    const key = `${school.region} ${school.district}`;
    groups.set(key, [...(groups.get(key) ?? []), school]);
  }

  return Array.from(groups.entries()).sort(([first], [second]) =>
    first.localeCompare(second, "ko")
  );
}

export function SafetyNetApp({
  areas,
  schools,
  learningResources,
  initialReport,
  dataMode,
  dataMeta,
  initialMapAcademies,
  initialSchoolSelector
}: SafetyNetAppProps) {
  const [selectedSchoolId, setSelectedSchoolId] = useState(schools[0]?.id ?? "");
  const [report, setReport] = useState<SchoolSafetyNetReport | null>(initialReport);
  const [reportError, setReportError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [selectorData, setSelectorData] =
    useState<SchoolDirectoryResult>(initialSchoolSelector);
  const [selectorLoading, setSelectorLoading] = useState(false);
  const [selectorError, setSelectorError] = useState("");
  const initialSchool = initialReport?.school ?? schools[0];
  const [regionFilter, setRegionFilter] = useState(initialSchool?.region ?? ALL_FILTER);
  const [districtFilter, setDistrictFilter] = useState(ALL_FILTER);
  const [schoolQuery, setSchoolQuery] = useState("");

  const averageScore = useMemo(
    () =>
      Math.round(areas.reduce((sum, area) => sum + area.score, 0) / Math.max(1, areas.length)),
    [areas]
  );
  const priorityCount = areas.filter(
    (area) =>
      area.risk === "PRIVATE_EDUCATION_DESERT" ||
      area.risk === "HIGH_COST_HOTSPOT" ||
      area.risk === "PUBLIC_SUPPORT_PRIORITY"
  ).length;
  const visibleAcademies = useMemo(
    () => (report?.nearbyAcademies ?? initialMapAcademies).slice(0, MAX_MAP_ACADEMY_MARKERS),
    [initialMapAcademies, report]
  );
  const currentReportSchool =
    report?.school.id === selectedSchoolId ? report.school : null;

  const selectSchool = useCallback((schoolId: string) => {
    const school =
      schools.find((entry) => entry.id === schoolId) ??
      selectorData.schools.find((entry) => entry.id === schoolId);
    if (school) {
      setRegionFilter(school.region);
      setDistrictFilter(school.district);
      setSchoolQuery("");
    }
    setSelectedSchoolId(schoolId);
  }, [schools, selectorData.schools]);

  function handleRegionFilterChange(nextRegion: string) {
    setRegionFilter(nextRegion);
    setDistrictFilter(ALL_FILTER);
    setSchoolQuery("");
  }

  function handleDistrictFilterChange(nextDistrict: string) {
    setDistrictFilter(nextDistrict);
    setSchoolQuery("");
  }

  function handleSchoolQueryChange(nextQuery: string) {
    setSchoolQuery(nextQuery);
  }

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      region: regionFilter,
      district: districtFilter,
      q: schoolQuery,
      limit: "500"
    });

    setSelectorLoading(true);
    setSelectorError("");

    fetch(`/api/schools/directory?${params.toString()}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("학교 목록을 불러오지 못했습니다.");
        }
        return response.json() as Promise<SchoolDirectoryResult>;
      })
      .then((payload) => {
        if (!active) {
          return;
        }

        setSelectorData(payload);
        if (
          payload.schools.length > 0 &&
          !payload.schools.some((school) => school.id === selectedSchoolId)
        ) {
          setSelectedSchoolId(payload.schools[0].id);
        }
      })
      .catch((error: Error) => {
        if (active) {
          setSelectorError(error.message);
        }
      })
      .finally(() => {
        if (active) {
          setSelectorLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [districtFilter, regionFilter, schoolQuery, selectedSchoolId]);

  useEffect(() => {
    if (!selectedSchoolId || report?.school.id === selectedSchoolId) {
      return;
    }

    let active = true;
    setReportLoading(true);
    setReportError("");

    fetch(`/api/schools/${selectedSchoolId}/safety-net?radiusKm=${WALKING_30_MIN_RADIUS_KM}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("학교 리포트를 불러오지 못했습니다.");
        }
        return response.json() as Promise<SchoolSafetyNetReport>;
      })
      .then((payload) => {
        if (active) {
          setReport(payload);
        }
      })
      .catch((error: Error) => {
        if (active) {
          setReportError(error.message);
        }
      })
      .finally(() => {
        if (active) {
          setReportLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [report?.school.id, selectedSchoolId]);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-rose-50 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-950">
      <header className="border-b border-sky-100 bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1500px] min-w-0 flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid min-w-0 gap-3 xl:flex-[0_1_560px] xl:max-w-[620px]">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-sky-500 text-white shadow-sm">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sky-700">대동학원도 2.0</p>
                <h1 className="text-balance text-xl font-semibold text-slate-950 sm:text-2xl">
                  우리 학교 주변 배움지도
                </h1>
                <p className="text-pretty text-sm text-slate-500">
                  가까운 학원, 학원비 부담, 오가는 길, 무료 배움터 빈틈
                </p>
              </div>
            </div>
            <DataSourceNotice dataMode={dataMode} dataMeta={dataMeta} />
          </div>

          <div className="grid w-full min-w-0 gap-2 rounded-lg border border-sky-100 bg-sky-50 p-3 shadow-sm xl:max-w-[880px] xl:flex-[1_1_720px]">
            <SchoolSelector
              selectedSchoolId={selectedSchoolId}
              regionFilter={regionFilter}
              districtFilter={districtFilter}
              schoolQuery={schoolQuery}
              regionOptions={selectorData.regions}
              districtOptions={selectorData.districts}
              filteredSchools={selectorData.schools}
              totalSchools={selectorData.total}
              loading={selectorLoading}
              error={selectorError}
              onRegionChange={handleRegionFilterChange}
              onDistrictChange={handleDistrictFilterChange}
              onQueryChange={handleSchoolQueryChange}
              onSchoolChange={setSelectedSchoolId}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-12">
        <section className="grid gap-4 lg:col-span-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label="오늘의 안심점수" value={averageScore} suffix="/100" tone="sky" />
            <Kpi label="도움이 필요한 곳" value={priorityCount} suffix="곳" tone="rose" />
            <Kpi
              label="살펴본 학원"
              value={dataMeta.totalAcademies}
              suffix="건"
              tone="emerald"
              description={`지도에 ${dataMeta.selectedAcademies.toLocaleString("ko-KR")}건 표시`}
            />
          </div>

          <SafetyMap
            areas={areas}
            academies={visibleAcademies}
            schools={schools}
            learningResources={learningResources}
            selectedSchoolId={selectedSchoolId}
            selectedSchool={currentReportSchool}
            onSelectSchool={selectSchool}
          />

          <AreaTable areas={areas} selectedSchoolId={selectedSchoolId} />
        </section>

        <section className="lg:col-span-4">
          <Tabs.Root defaultValue="school" className="rounded-lg border border-sky-100 bg-white shadow-sm">
            <Tabs.List className="grid grid-cols-4 border-b border-sky-100 bg-sky-50 p-1">
              <TabTrigger value="school" icon={SchoolIcon} label="학교" />
              <TabTrigger value="parent" icon={FileText} label="학부모" />
              <TabTrigger value="policy" icon={SlidersHorizontal} label="늘리기" />
              <TabTrigger value="quality" icon={AlertTriangle} label="체크" />
            </Tabs.List>

            <Tabs.Content value="school" className="p-4">
              {reportLoading ? (
                <LoadingRows />
              ) : reportError ? (
                <InlineError message={reportError} />
              ) : report ? (
                <SchoolReport report={report} />
              ) : null}
            </Tabs.Content>

            <Tabs.Content value="parent" className="p-4">
              <ParentPlanPanel schoolId={selectedSchoolId} selectedSchool={currentReportSchool} />
            </Tabs.Content>

            <Tabs.Content value="policy" className="p-4">
              <PolicyPanel schoolId={selectedSchoolId} />
            </Tabs.Content>

            <Tabs.Content value="quality" className="p-4">
              <DataQualityPanel />
            </Tabs.Content>
          </Tabs.Root>
        </section>
      </div>
    </main>
  );
}

function SchoolSelector({
  selectedSchoolId,
  regionFilter,
  districtFilter,
  schoolQuery,
  regionOptions,
  districtOptions,
  filteredSchools,
  totalSchools,
  loading,
  error,
  onRegionChange,
  onDistrictChange,
  onQueryChange,
  onSchoolChange
}: {
  selectedSchoolId: string;
  regionFilter: string;
  districtFilter: string;
  schoolQuery: string;
  regionOptions: string[];
  districtOptions: string[];
  filteredSchools: School[];
  totalSchools: number;
  loading: boolean;
  error: string;
  onRegionChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onSchoolChange: (value: string) => void;
}) {
  const selectedSchoolInFilter = filteredSchools.some(
    (school) => school.id === selectedSchoolId
  );
  const groupedSchools = useMemo(
    () => groupSchoolsForSelect(filteredSchools),
    [filteredSchools]
  );

  return (
    <div className="grid min-w-0 gap-2">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[150px_150px_minmax(180px,1fr)_minmax(220px,1.3fr)]">
        <label className="grid min-w-0 gap-1 text-sm">
          <span className="font-medium text-slate-600">시도</span>
          <select
            value={regionFilter}
            onChange={(event) => onRegionChange(event.target.value)}
            className="h-11 w-full min-w-0 rounded-lg border border-sky-200 bg-white px-3 text-slate-950 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value={ALL_FILTER}>전체 시도</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1 text-sm">
          <span className="font-medium text-slate-600">시군구</span>
          <select
            value={districtFilter}
            onChange={(event) => onDistrictChange(event.target.value)}
            disabled={regionFilter === ALL_FILTER}
            className="h-11 w-full min-w-0 rounded-lg border border-sky-200 bg-white px-3 text-slate-950 shadow-sm outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value={ALL_FILTER}>
              {regionFilter === ALL_FILTER ? "시도 선택" : "전체 시군구"}
            </option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-1 text-sm">
          <span className="font-medium text-slate-600">학교명 검색</span>
          <input
            type="search"
            value={schoolQuery}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="예: 강릉중, 대치"
            className="h-11 w-full min-w-0 rounded-lg border border-sky-200 bg-white px-3 text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </label>

        <label className="grid min-w-0 gap-1 text-sm">
          <span className="flex items-center justify-between gap-2 font-medium text-slate-600">
            학교 선택
            <span className="text-xs font-normal tabular-nums text-slate-500">
              {totalSchools.toLocaleString("ko-KR")}곳
            </span>
          </span>
          <select
            value={selectedSchoolInFilter ? selectedSchoolId : ""}
            onChange={(event) => onSchoolChange(event.target.value)}
            disabled={filteredSchools.length === 0}
            className="h-11 w-full min-w-0 rounded-lg border border-sky-200 bg-white px-3 text-slate-950 shadow-sm outline-none disabled:bg-slate-100 disabled:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            {filteredSchools.length === 0 ? (
              <option value="">{loading ? "검색 중" : "검색 결과 없음"}</option>
            ) : (
              groupedSchools.map(([groupLabel, groupSchools]) => (
                <optgroup key={groupLabel} label={groupLabel}>
                  {groupSchools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </optgroup>
              ))
            )}
          </select>
        </label>
      </div>

      {error ? <InlineError message={error} /> : null}
      {totalSchools > filteredSchools.length ? (
        <p className="min-w-0 max-w-full text-pretty text-xs leading-5 text-slate-500">
          결과가 많아 상위 {filteredSchools.length.toLocaleString("ko-KR")}개만 표시합니다.
          시군구나 학교명으로 더 좁혀 선택하세요.
        </p>
      ) : null}
      {filteredSchools.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>해당 조건의 학교가 없습니다.</span>
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-sm font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            검색 초기화
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DataSourceNotice({
  dataMode,
  dataMeta
}: {
  dataMode: "imported-dump" | "demo";
  dataMeta: PublicDataMeta;
}) {
  const isImported = dataMode === "imported-dump";

  return (
    <div className="w-fit max-w-full rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Database className="size-4 text-sky-600" aria-hidden="true" />
        <span className="font-medium text-slate-800">
          {isImported ? "실제 학교·학원 데이터로 계산 중" : "데모 데이터로 살펴보기"}
        </span>
        <span className="text-pretty text-xs leading-5 text-slate-500">
          원천 {dataMeta.totalSchools.toLocaleString("ko-KR")}개 학교 ·{" "}
          {dataMeta.totalAcademies.toLocaleString("ko-KR")}개 학원, 학교 주변{" "}
          {dataMeta.selectedSchools.toLocaleString("ko-KR")}곳 분석
        </span>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix,
  description,
  tone = "slate"
}: {
  label: string;
  value: number;
  suffix: string;
  description?: string;
  tone?: KpiTone;
}) {
  const toneClass: Record<KpiTone, string> = {
    sky: "border-sky-100 bg-sky-50",
    emerald: "border-emerald-100 bg-emerald-50",
    amber: "border-amber-100 bg-amber-50",
    rose: "border-rose-100 bg-rose-50",
    slate: "border-slate-200 bg-white"
  };

  return (
    <div className={cn("rounded-lg border p-4 shadow-sm", toneClass[tone])}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">
        {value.toLocaleString("ko-KR")}
        <span className="ml-1 text-base text-slate-500">{suffix}</span>
      </p>
      {description ? (
        <p className="mt-1 text-pretty text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

function TabTrigger({
  value,
  icon: Icon,
  label
}: {
  value: string;
  icon: typeof SchoolIcon;
  label: string;
}) {
  return (
    <Tabs.Trigger
      value={value}
      className="inline-flex h-10 items-center justify-center gap-1 rounded-md text-sm font-medium text-slate-600 outline-none data-[state=active]:bg-sky-500 data-[state=active]:text-white focus-visible:ring-2 focus-visible:ring-sky-500"
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </Tabs.Trigger>
  );
}

function AreaTable({ areas, selectedSchoolId }: { areas: AreaScore[]; selectedSchoolId: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-sky-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-sky-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">걸어서 30분 배움 분석</h2>
        <span className="text-xs tabular-nums text-slate-500">
          {areas.length.toLocaleString("ko-KR")}곳
        </span>
      </div>
      <div className="grid grid-cols-[1.5fr_1fr_80px] border-b border-sky-100 bg-sky-50 px-4 py-3 text-xs font-semibold text-slate-500 sm:grid-cols-[1.5fr_1fr_90px_90px]">
        <span>학교 주변</span>
        <span>분류</span>
        <span className="text-right">점수</span>
        <span className="hidden text-right sm:block">학원</span>
      </div>
      <div className="max-h-[460px] overflow-y-auto">
        {areas.map((area) => (
          <div
            key={area.id}
            className={cn(
              "grid grid-cols-[1.5fr_1fr_80px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[1.5fr_1fr_90px_90px]",
              area.id.includes(selectedSchoolId) && "bg-sky-50"
            )}
          >
            <span className="truncate font-medium">{area.label}</span>
            <RiskBadge risk={area.risk} />
            <span className="text-right tabular-nums">{area.score}</span>
            <span className="hidden text-right tabular-nums sm:block">
              {area.evidence.registeredAcademyCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchoolReport({ report }: { report: SchoolSafetyNetReport }) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {report.school.region} {report.school.district}
          </p>
          <h2 className="mt-1 text-balance text-xl font-semibold">{report.school.name}</h2>
        </div>
        <RiskBadge risk={report.risk} />
      </div>

      <ScoreGauge label="배움 안심 점수" score={report.score} />

      <p className="text-pretty rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-6 text-slate-700">
        {RISK_DESCRIPTIONS[report.risk]}
      </p>

      <div className="grid gap-2">
        {Object.entries(report.metrics).map(([key, value]) => (
          <div key={key} className="grid grid-cols-[120px_1fr_42px] items-center gap-3 text-sm">
            <span className="text-slate-600">
              {metricLabels[key as keyof SchoolSafetyNetReport["metrics"]]}
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-500" style={{ width: `${value}%` }} />
            </div>
            <span className="text-right tabular-nums text-slate-700">{value}</span>
          </div>
        ))}
      </div>

      <EvidenceStrip report={report} />
      <RecommendationList items={report.recommendations} />
      <AiReportPanel schoolId={report.school.id} />
    </div>
  );
}

function EvidenceStrip({ report }: { report: SchoolSafetyNetReport }) {
  const items = [
    {
      icon: Landmark,
      label: "등록 학원",
      value: `${report.evidence.registeredAcademyCount}곳`
    },
    {
      icon: Library,
      label: "무료 배움터",
      value: `${report.evidence.publicResourceCount}곳`
    },
    {
      icon: Bus,
      label: "정류장",
      value: `${report.evidence.transitStopCount}곳`
    },
    {
      icon: AlertTriangle,
      label: "평균 학원비",
      value: formatWon(report.evidence.averageMonthlyFee)
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-lg border border-sky-100 bg-sky-50 p-3">
          <Icon className="size-4 text-sky-600" aria-hidden="true" />
          <p className="mt-2 text-xs text-slate-500">{label}</p>
          <p className="mt-1 font-semibold tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}

function RecommendationList({ items }: { items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">바로 해볼 일</h3>
      <ul className="mt-2 grid gap-2">
        {items.map((item) => (
          <li key={item} className="text-pretty rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ParentPlanPanel({
  schoolId,
  selectedSchool
}: {
  schoolId: string;
  selectedSchool: School | null;
}) {
  const [budget, setBudget] = useState(300000);
  const [interests, setInterests] = useState<string[]>(["수학", "영어"]);
  const [result, setResult] = useState<ParentPlanResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleInterest(value: string) {
    setInterests((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/parent-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, budget, interests, radiusKm: WALKING_30_MIN_RADIUS_KM })
    });

    setLoading(false);

    if (!response.ok) {
      setError("학부모 플랜을 만들지 못했습니다.");
      return;
    }

    setResult((await response.json()) as ParentPlanResult);
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-balance text-lg font-semibold">우리 아이 배움 플랜</h2>
        <p className="mt-1 text-sm text-slate-500">
          {selectedSchool?.name} 기준 · 걸어서 30분 안에서 계산
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">월 예산</span>
          <input
            type="number"
            min={0}
            step={10000}
            value={budget}
            onChange={(event) => setBudget(Number(event.target.value))}
            className="h-11 rounded-lg border border-sky-200 bg-white px-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium text-slate-700">보고 싶은 과목</legend>
          <div className="grid grid-cols-2 gap-2">
            {INTERESTS.map((interest) => (
              <label
                key={interest}
                className="flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={interests.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                  className="size-4 accent-sky-600"
                />
                {interest}
              </label>
            ))}
          </div>
        </fieldset>

        {error ? <InlineError message={error} /> : null}

        <button
          type="submit"
          disabled={loading || interests.length === 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <FileText className="size-4" aria-hidden="true" />
          {loading ? "생성 중" : "플랜 만들기"}
        </button>
      </form>

      {result ? <ParentPlanResultView result={result} /> : null}
    </div>
  );
}

function ParentPlanResultView({ result }: { result: ParentPlanResult }) {
  return (
    <div className="grid gap-4 border-t border-sky-100 pt-4">
      <ResultSection title="학원 선택지">
        {result.privateOptions.length > 0 ? (
          result.privateOptions.map((option) => (
            <div key={option.academy.id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{option.academy.name}</p>
                  <p className="text-sm text-slate-500">
                    {option.academy.group} · {option.distanceKm}km
                  </p>
                </div>
                <span className="text-sm tabular-nums">
                  {formatWon(option.academy.monthlyFee)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <EmptyState text="관심 과목과 거리 안에 맞는 학원이 없습니다." />
        )}
      </ResultSection>

      <ResultSection title="무료 배움터">
        {result.publicAlternatives.map((option) => (
          <div key={option.resource.id} className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
            <p className="font-medium">{option.resource.name}</p>
            <p className="text-sm text-slate-500">
              {RESOURCE_LABELS[option.resource.type]} · {option.distanceKm}km · {option.resource.operatingHours}
            </p>
          </div>
        ))}
      </ResultSection>

      <ResultSection title="돈·길 체크">
        {[...result.costWarnings, ...result.commuteRisks].map((item) => (
          <p key={item} className="text-pretty rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-slate-700">
            {item}
          </p>
        ))}
      </ResultSection>

      <p className="text-pretty rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs leading-5 text-slate-500">
        {result.privacyNote}
      </p>
    </div>
  );
}

function PolicyPanel({ schoolId }: { schoolId: string }) {
  const [slots, setSlots] = useState(80);
  const [programType, setProgramType] = useState<ProgramType>("MATH_AFTER_SCHOOL");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/policy-simulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        scenarioName: "방과후 무료 배움터 늘리기",
        programType,
        slots,
        radiusKm: WALKING_30_MIN_RADIUS_KM
      })
    });

    setLoading(false);

    if (!response.ok) {
      setError("늘려보기 계산을 실행하지 못했습니다.");
      return;
    }

    setResult((await response.json()) as SimulationResult);
  }

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-balance text-lg font-semibold">배움터 늘려보기</h2>
        <p className="mt-1 text-sm text-slate-500">자리를 늘리면 몇 명이 도움받는지 봐요.</p>
      </div>

      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">프로그램</span>
          <select
            value={programType}
            onChange={(event) =>
              setProgramType(event.target.value as ProgramType)
            }
            className="h-11 rounded-lg border border-sky-200 bg-white px-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="MATH_AFTER_SCHOOL">학교 방과후 수학반</option>
            <option value="PUBLIC_LEARNING_CENTER">동네 무료 학습센터</option>
            <option value="MENTORING">멘토링</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">제공 좌석</span>
          <input
            type="number"
            min={5}
            max={500}
            value={slots}
            onChange={(event) => setSlots(Number(event.target.value))}
            className="h-11 rounded-lg border border-sky-200 bg-white px-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </label>

        {error ? <InlineError message={error} /> : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {loading ? "계산 중" : "좋아질 폭 보기"}
        </button>
      </form>

      {result ? (
        <div className="grid gap-3 border-t border-sky-100 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="도움받을 학생" value={result.result.reducedStudents} suffix="명" tone="emerald" />
            <Kpi label="바뀐 점수" value={result.result.afterScore} suffix="/100" tone="sky" />
          </div>
          <p className="text-pretty rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-slate-700">
            {result.result.recommendedOperation} 운영 시 도움이 필요한 학생{" "}
            <span className="font-semibold tabular-nums">
              {result.result.estimatedGapStudents}명
            </span>
            중{" "}
            <span className="font-semibold tabular-nums">
              {result.result.reducedStudents}명
            </span>
            에게 먼저 자리를 줄 수 있습니다.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function AiReportPanel({ schoolId }: { schoolId: string }) {
  const [report, setReport] = useState<AiReport | null>(null);
  const [error, setError] = useState("");
  const [loadingType, setLoadingType] = useState<string | null>(null);

  async function requestReport(reportType: AiReport["generatedBy"] | string) {
    setLoadingType(reportType);
    setError("");

    const response = await fetch("/api/ai/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportType, schoolId })
    });

    setLoadingType(null);

    if (!response.ok) {
      setError("근거 요약을 만들지 못했습니다.");
      return;
    }

    setReport((await response.json()) as AiReport);
  }

  return (
    <div className="border-t border-sky-100 pt-4">
      <h3 className="text-sm font-semibold text-slate-950">짧게 보기</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {[
          ["PARENT_ONE_PAGE", "가정"],
          ["PRINCIPAL_PROPOSAL", "학교"],
          ["DISTRICT_MEMO", "지역"]
        ].map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => requestReport(type)}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-sky-200 bg-white px-2 text-sm font-medium text-slate-700 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Bot className="size-4" aria-hidden="true" />
            {loadingType === type ? "생성" : label}
          </button>
        ))}
      </div>
      {error ? <InlineError message={error} /> : null}
      {report ? (
        <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-3">
          <p className="font-semibold">{report.title}</p>
          <p className="mt-2 text-pretty text-sm leading-6 text-slate-700">{report.summary}</p>
          <ul className="mt-2 grid gap-1 text-sm text-slate-600">
            {report.actions.map((action) => (
              <li key={action}>- {action}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DataQualityPanel() {
  const [data, setData] = useState<DataQuality | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/data-quality")
      .then((response) => {
        if (!response.ok) {
          throw new Error("데이터 체크 정보를 불러오지 못했습니다.");
        }
        return response.json() as Promise<DataQuality>;
      })
      .then((payload) => {
        if (active) {
          setData(payload);
        }
      })
      .catch((caught: Error) => {
        if (active) {
          setError(caught.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-balance text-lg font-semibold">데이터 체크</h2>
        <p className="mt-1 text-sm text-slate-500">믿고 볼 것과 확인할 것을 나눠요.</p>
      </div>

      {error ? <InlineError message={error} /> : null}
      {!data && !error ? <LoadingRows /> : null}

      {data ? (
        <>
          <DataSourceNotice dataMode={data.dataMode} dataMeta={data.dataMeta} />
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.sourceCoverage).map(([key, value]) => (
              <Kpi key={key} label={coverageLabels[key] ?? key} value={value} suffix="건" />
            ))}
          </div>
          <div className="grid gap-2">
            {data.issues.map((issue) => (
              <div key={issue.issueType} className="rounded-lg border border-sky-100 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{issue.summary}</p>
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-semibold",
                      issue.severity === "ok"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    )}
                  >
                    {qualityLabels[issue.severity] ?? issue.severity}
                  </span>
                </div>
                <p className="mt-2 text-pretty text-sm leading-5 text-slate-600">{issue.impact}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ResultSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function LoadingRows() {
  return (
    <div className="grid gap-3">
      <div className="h-16 rounded-lg bg-sky-50" />
      <div className="h-24 rounded-lg bg-sky-50" />
      <div className="h-32 rounded-lg bg-sky-50" />
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </p>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-slate-500">
      {text}
    </p>
  );
}

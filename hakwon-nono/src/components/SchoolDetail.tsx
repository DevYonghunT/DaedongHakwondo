"use client";

import { useEffect, useState } from "react";
import {
  TrendingDown,
  TrendingUp,
  Lightbulb,
  MapPin,
  Phone,
  ExternalLink,
  Utensils,
  Calendar,
  School as SchoolIcon,
} from "lucide-react";
import { getRealmColor, getRealmLabel } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PanelHeader, PanelSection, InfoRow } from "@/components/panels/PanelParts";
import { cn } from "@/lib/utils";

const REALM_SUGGESTIONS: Record<string, string> = {
  "입시.검정 및 보습": "국어·영어·수학 보충학습, 기초학력 향상 프로그램",
  "예능(대)": "미술, 음악, 무용, 연극 등 예체능 프로그램",
  외국어: "영어 회화, 중국어, 일본어 등 외국어 프로그램",
  "종합(대)": "종합 학습, 멘토링, 자기주도학습 프로그램",
  직업기술: "직업체험, 기술교육, 진로탐색 프로그램",
  독서실: "독서토론, 자기주도학습 공간 제공",
  기타: "다양한 특기적성 프로그램",
  정보: "코딩, SW교육, AI 교육, 로봇공학 프로그램",
  "사고력/교양": "토론, 논술, 사고력 향상 프로그램",
  "특수교육(대)": "특수교육 대상 학생 맞춤 프로그램",
};

interface SchoolDetailData {
  school: {
    id: string;
    name: string;
    kind: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    coedu: string | null;
    foundation: string | null;
    hsType: string | null;
    phone: string | null;
    homepage: string | null;
    foundingDate: string | null;
    fax: string | null;
  };
  meal: { date: string; menu: string[] } | null;
  schedule: Array<{ date: string; event: string }>;
  nearbyAcademies: {
    total: number;
    byRealm: Array<{ realm: string; count: number }>;
  };
}

interface NearbyRealmData {
  realm: string;
  count: number;
  avgCount: number;
  ratio: number;
  avgRatio: number;
}

interface NearbyApiResponse {
  total: number;
  sido?: string;
  sidoSchoolCount?: number;
  byRealm: NearbyRealmData[];
  avgTuition: number | null;
}

interface DeficientRealm {
  realm: string;
  label: string;
  count: number;
  avgCount: number;
  suggestion: string;
}

interface SchoolDetailProps {
  schoolId: string;
  onClose: () => void;
  embedded?: boolean;
}

function getKindBadgeVariant(kind: string | null) {
  switch (kind) {
    case "초등학교":
      return "success" as const;
    case "중학교":
      return "default" as const;
    case "고등학교":
      return "soft" as const;
    default:
      return "secondary" as const;
  }
}

export default function SchoolDetail({ schoolId, onClose, embedded }: SchoolDetailProps) {
  const [data, setData] = useState<SchoolDetailData | null>(null);
  const [nearbyData, setNearbyData] = useState<NearbyApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [detailRes, nearbyRes] = await Promise.all([
          fetch(`/api/schools/${schoolId}/detail`),
          fetch(`/api/schools/${schoolId}/nearby?radius=1`),
        ]);
        if (!detailRes.ok) throw new Error("조회 실패");
        const detailJson = await detailRes.json();
        setData(detailJson);
        if (nearbyRes.ok) {
          const nearbyJson: NearbyApiResponse = await nearbyRes.json();
          setNearbyData(nearbyJson);
        }
      } catch {
        setError("학교 정보를 불러올 수 없습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [schoolId]);

  const school = data?.school;

  const maxCount = data?.nearbyAcademies?.byRealm?.length
    ? Math.max(...data.nearbyAcademies.byRealm.map((r) => r.count))
    : 1;

  const formatScheduleDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  };

  const deficientRealms = findDeficientRealms(nearbyData?.byRealm ?? []);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background",
        !embedded && "fixed top-14 right-0 bottom-0 w-full sm:w-[440px] z-[1100] shadow-modal border-l border-border animate-slide-in-right",
      )}
    >
      <PanelHeader
        eyebrow="학교"
        title={isLoading ? <Skeleton width="w-40" height="h-5" /> : school?.name || "학교 정보"}
        subtitle={
          school ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {school.kind && (
                <Badge variant={getKindBadgeVariant(school.kind)} className="h-5 px-2 text-[11px]">
                  {school.kind}
                </Badge>
              )}
              {school.foundation && (
                <Badge variant="outline" className="h-5 px-2 text-[11px]">
                  {school.foundation}
                </Badge>
              )}
              {school.hsType && (
                <Badge variant="outline" className="h-5 px-2 text-[11px]">
                  {school.hsType}
                </Badge>
              )}
            </span>
          ) : null
        }
        badge={
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <SchoolIcon className="h-4 w-4" />
          </span>
        }
        favorite={
          school
            ? {
                id: school.id,
                type: "school",
                name: school.name,
                subtitle: school.kind || undefined,
              }
            : undefined
        }
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-5 space-y-3">
            <Skeleton height="h-4" />
            <Skeleton height="h-4" width="w-3/4" />
            <Skeleton height="h-32" />
          </div>
        )}

        {error && <p className="p-5 text-sm text-destructive">{error}</p>}

        {data && school && !isLoading && (
          <>
            <PanelSection title="기본 정보" icon={<MapPin className="h-3.5 w-3.5" />}>
              {school.address && <InfoRow label="주소" value={school.address} />}
              {school.phone && (
                <InfoRow
                  label="전화"
                  value={
                    <a
                      href={`tel:${school.phone}`}
                      className="text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {school.phone}
                    </a>
                  }
                />
              )}
              {school.fax && <InfoRow label="팩스" value={school.fax} />}
              {school.homepage && (
                <InfoRow
                  label="홈페이지"
                  value={
                    <a
                      href={school.homepage.startsWith("http") ? school.homepage : `http://${school.homepage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      홈페이지 바로가기
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  }
                />
              )}
              {school.foundingDate && <InfoRow label="개교일" value={school.foundingDate} />}
            </PanelSection>

            <PanelSection
              title="반경 1km 학원"
              hint={`총 ${data.nearbyAcademies.total}개`}
              icon={<MapPin className="h-3.5 w-3.5" />}
            >
              {data.nearbyAcademies.total > 0 ? (
                <div className="space-y-2">
                  {data.nearbyAcademies.byRealm.map((item) => {
                    const label = getRealmLabel(item.realm);
                    const color = getRealmColor(item.realm);
                    const barWidth = Math.max(8, (item.count / maxCount) * 100);
                    return (
                      <div key={item.realm} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">
                          {label}
                        </span>
                        <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md flex items-center justify-end pr-2 transition-all duration-500"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: color,
                              minWidth: "32px",
                            }}
                          >
                            <span className="text-[10px] font-bold text-white tabular-nums">
                              {item.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">주변에 등록된 학원이 없습니다.</p>
              )}
            </PanelSection>

            {nearbyData && (
              <PanelSection
                title={`방과후 추천 (${nearbyData.sido || "전국"} 평균 대비)`}
                icon={<Lightbulb className="h-3.5 w-3.5" />}
              >
                {deficientRealms.length > 0 ? (
                  <div className="space-y-3">
                    {deficientRealms.map((item) => (
                      <div
                        key={item.realm}
                        className="rounded-lg border border-warning/30 bg-warning/5 p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="h-4 w-4 text-warning" />
                          <span className="text-sm font-semibold text-foreground">
                            {item.label} 분야 부족
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span>
                            주변{" "}
                            <span className="font-semibold text-foreground tabular-nums">
                              {item.count}
                            </span>
                            개
                          </span>
                          <span>
                            평균{" "}
                            <span className="font-semibold text-foreground tabular-nums">
                              {item.avgCount}
                            </span>
                            개
                          </span>
                        </div>
                        <div className="space-y-1 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-8">주변</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${item.avgCount > 0 ? Math.min((item.count / item.avgCount) * 100, 100) : 0}%`,
                                  backgroundColor: getRealmColor(item.realm),
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-8">평균</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-muted-foreground/60" style={{ width: "100%" }} />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed">
                          ▸ {item.suggestion}
                        </p>
                      </div>
                    ))}
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-foreground/85 leading-relaxed">
                        <strong className="text-foreground">{deficientRealms.map((r) => r.label).join(", ")}</strong>{" "}
                        분야 방과후 활동을 개설하면 사교육 접근성 격차를 줄일 수 있어요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-success/5 border border-success/30 p-3 flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground/85 leading-relaxed">
                      이 학교 주변은 {nearbyData.sido} 평균 대비 학원이 충분합니다.
                    </p>
                  </div>
                )}
              </PanelSection>
            )}

            <PanelSection title="오늘의 급식" icon={<Utensils className="h-3.5 w-3.5" />}>
              {data.meal ? (
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-2">{data.meal.date}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.meal.menu.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-block rounded-md border border-border bg-card px-2 py-0.5 text-xs text-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">급식 정보가 없습니다.</p>
              )}
            </PanelSection>

            <PanelSection title="이번 주 학사일정" icon={<Calendar className="h-3.5 w-3.5" />}>
              {data.schedule.length > 0 ? (
                <div className="space-y-1.5">
                  {data.schedule.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-md bg-secondary/40 px-3 py-2"
                    >
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0 tabular-nums">
                        {formatScheduleDate(item.date)}
                      </span>
                      <span className="text-sm text-foreground">{item.event}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">이번 주 일정이 없습니다.</p>
              )}
            </PanelSection>
          </>
        )}
      </div>
    </div>
  );
}

function findDeficientRealms(byRealm: NearbyRealmData[]): DeficientRealm[] {
  const results: DeficientRealm[] = [];
  for (const item of byRealm) {
    if (item.avgCount > item.count) {
      results.push({
        realm: item.realm,
        label: getRealmLabel(item.realm),
        count: item.count,
        avgCount: item.avgCount,
        suggestion: REALM_SUGGESTIONS[item.realm] || "다양한 특기적성 프로그램",
      });
    }
  }
  results.sort((a, b) => b.avgCount - b.count - (a.avgCount - a.count));
  return results;
}

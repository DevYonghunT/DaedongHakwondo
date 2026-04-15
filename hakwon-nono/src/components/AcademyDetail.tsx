"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone, BookOpen, Wallet, Building2 } from "lucide-react";
import { getRealmColor, getRealmLabel } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { PanelHeader, PanelSection, InfoRow } from "@/components/panels/PanelParts";
import { cn } from "@/lib/utils";

/** 학원 상세 데이터 */
export interface AcademyDetailData {
  id: string;
  academyNm: string;
  academyType: string | null;
  realmScNm: string | null;
  leOrdNm: string | null;
  leCrseNm: string | null;
  leSubjectNm: string | null;
  capacity: number | null;
  tuitionFee: number | null;
  address: string | null;
  addressDetail: string | null;
  zipCode: string | null;
  phoneNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  regStatus: string | null;
  establishedDate: string | null;
  closedDate: string | null;
  atptOfcdcScNm: string | null;
  isBranch: string | null;
  totalCapacity: number | null;
  courseList: string | null;
  tuitionBreakdown: Array<{ subject: string; fee: number }>;
}

interface AcademyDetailProps {
  academyId: string;
  onClose: () => void;
  embedded?: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr || dateStr.trim() === "" || dateStr === "99991231") return "-";
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  return `${y}.${m}.${d}`;
}

function formatFee(fee: number): string {
  return fee.toLocaleString() + "원";
}

export default function AcademyDetail({ academyId, onClose, embedded }: AcademyDetailProps) {
  const [academy, setAcademy] = useState<AcademyDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/academies/${academyId}`);
        if (!res.ok) throw new Error("조회 실패");
        const data = await res.json();
        setAcademy(data.academy);
      } catch {
        setError("학원 정보를 불러올 수 없습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [academyId]);

  const realmColor = academy?.realmScNm ? getRealmColor(academy.realmScNm) : "hsl(var(--muted))";
  const realmLabel = academy?.realmScNm ? getRealmLabel(academy.realmScNm) : null;

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background",
        !embedded && "fixed top-14 right-0 bottom-0 w-full sm:w-[440px] z-[1100] shadow-modal border-l border-border animate-slide-in-right",
      )}
    >
      <PanelHeader
        eyebrow="학원"
        title={isLoading ? <Skeleton width="w-40" height="h-5" /> : academy?.academyNm || "학원 정보"}
        subtitle={
          academy ? (
            <span className="flex items-center gap-1.5">
              {academy.academyType}
              {academy.isBranch === "Y" && (
                <Badge variant="outline" className="h-4 px-1.5 text-[10px]">분원</Badge>
              )}
            </span>
          ) : null
        }
        badge={
          realmLabel ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: realmColor }}
            >
              {realmLabel}
            </span>
          ) : null
        }
        favorite={
          academy
            ? {
                id: academy.id,
                type: "academy",
                name: academy.academyNm,
                subtitle: academy.realmScNm || undefined,
              }
            : undefined
        }
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-5 space-y-4">
            <Skeleton height="h-4" />
            <Skeleton height="h-4" width="w-3/4" />
            <Skeleton height="h-32" />
          </div>
        )}

        {error && <p className="p-5 text-sm text-destructive">{error}</p>}

        {academy && !isLoading && (
          <>
            <PanelSection title="기본 정보" icon={<MapPin className="h-3.5 w-3.5" />}>
              <InfoRow
                label="주소"
                value={academy.address ? `${academy.address}${academy.addressDetail || ""}` : "-"}
              />
              {academy.phoneNumber && academy.phoneNumber.trim() !== "" && (
                <InfoRow
                  label="전화"
                  value={
                    <a
                      href={`tel:${academy.phoneNumber}`}
                      className="text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      {academy.phoneNumber}
                    </a>
                  }
                />
              )}
              <InfoRow label="교육청" value={academy.atptOfcdcScNm} />
              <InfoRow
                label="등록상태"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        academy.regStatus === "개원" ? "bg-success" : "bg-muted-foreground/50",
                      )}
                    />
                    {academy.regStatus || "-"}
                  </span>
                }
              />
              <InfoRow label="설립일" value={formatDate(academy.establishedDate)} />
            </PanelSection>

            <PanelSection title="교습 정보" icon={<BookOpen className="h-3.5 w-3.5" />}>
              <InfoRow label="교습계열" value={academy.leOrdNm} />
              <InfoRow label="교습과정" value={academy.leCrseNm} />
              {academy.leSubjectNm && <InfoRow label="교습과목" value={academy.leSubjectNm} />}
              {academy.courseList && <InfoRow label="과목 목록" value={academy.courseList} />}
              {academy.totalCapacity && (
                <InfoRow label="총 정원" value={`${academy.totalCapacity}명`} />
              )}
              {academy.capacity && <InfoRow label="수용 인원" value={`${academy.capacity}명`} />}
            </PanelSection>

            <PanelSection title="수강료" icon={<Wallet className="h-3.5 w-3.5" />}>
              {academy.tuitionBreakdown.length > 0 ? (
                <div className="space-y-1.5">
                  {academy.tuitionBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2"
                    >
                      <span className="text-sm text-foreground">{item.subject}</span>
                      <span className="text-sm font-semibold text-primary tabular-nums">
                        {item.fee > 0 ? formatFee(item.fee) : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : academy.tuitionFee ? (
                <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2">
                  <span className="text-sm text-foreground">수강료</span>
                  <span className="text-sm font-semibold text-primary tabular-nums">
                    {formatFee(academy.tuitionFee)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">수강료 정보가 없습니다.</p>
              )}
            </PanelSection>

            <PanelSection title="원본 데이터" icon={<Building2 className="h-3.5 w-3.5" />}>
              <p className="text-xs text-muted-foreground">
                나이스 교육정보 개방포털 학원교습소정보 API
              </p>
            </PanelSection>
          </>
        )}
      </div>
    </div>
  );
}

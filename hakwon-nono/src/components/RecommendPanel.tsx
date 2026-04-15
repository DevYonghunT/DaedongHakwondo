"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, Wallet, Target, Compass, School } from "lucide-react";
import { getRealmColor, getRealmLabel, ALL_REALMS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { Badge } from "@/components/ui/Badge";
import { PanelHeader, PanelSection } from "@/components/panels/PanelParts";
import AIMarkdown from "@/components/AIMarkdown";
import { cn } from "@/lib/utils";
import { formatDistance, formatTuition } from "@/lib/utils";

interface RecommendedAcademy {
  id: string;
  name: string;
  realm: string | null;
  subject: string | null;
  tuitionFee: number | null;
  distance: number;
}

interface RecommendResult {
  recommendation: string;
  academies: RecommendedAcademy[];
  schoolName: string;
  total: number;
}

interface RecommendPanelProps {
  school: {
    id: string;
    name: string;
    kind: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  onClose: () => void;
  embedded?: boolean;
}

const RADIUS_OPTIONS = [1, 2, 3, 5];

export default function RecommendPanel({ school, onClose, embedded }: RecommendPanelProps) {
  const [budget, setBudget] = useState(30);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [radius, setRadius] = useState(2);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = useCallback((realm: string) => {
    setSelectedInterests((prev) =>
      prev.includes(realm) ? prev.filter((r) => r !== realm) : [...prev, realm],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!school) {
      setError("학교를 먼저 선택해주세요");
      return;
    }
    if (selectedInterests.length === 0) {
      setError("관심 분야를 1개 이상 선택해주세요");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: school.id,
          budget,
          interests: selectedInterests,
          radius,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 추천 요청에 실패했습니다");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 추천 요청에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [school, budget, selectedInterests, radius]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background",
        !embedded &&
          "fixed top-14 right-0 bottom-0 w-full sm:w-[440px] z-[1100] shadow-modal border-l border-border animate-slide-in-right",
      )}
    >
      <PanelHeader
        eyebrow="AI 추천"
        title="맞춤 학원 추천"
        subtitle={school ? `${school.name} 기준` : "학교를 먼저 선택해주세요"}
        badge={
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
        }
        onClose={onClose}
      />

      <div className="flex-1 overflow-y-auto">
        {/* 기준 학교 */}
        <PanelSection title="기준 학교" icon={<School className="h-3.5 w-3.5" />}>
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-sm">
            {school ? (
              <span className="flex items-center gap-2">
                <span className="font-medium text-foreground">{school.name}</span>
                {school.kind && <Badge variant="outline">{school.kind}</Badge>}
              </span>
            ) : (
              <span className="text-muted-foreground">지도에서 학교를 검색/선택해주세요</span>
            )}
          </div>
        </PanelSection>

        {/* 월 예산 */}
        <PanelSection title="월 예산" icon={<Wallet className="h-3.5 w-3.5" />}>
          <div className="flex items-center gap-2 mb-3">
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Math.max(1, parseInt(e.target.value) || 0))}
              min={1}
              step={5}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">만원</span>
          </div>
          <Slider
            value={[budget]}
            min={5}
            max={150}
            step={5}
            onValueChange={(v) => setBudget(v[0])}
          />
          <p className="text-xs text-muted-foreground mt-2">
            월 {budget.toLocaleString("ko-KR")}만원 = 연 {(budget * 12).toLocaleString("ko-KR")}만원
          </p>
        </PanelSection>

        {/* 관심 분야 */}
        <PanelSection title="관심 분야" icon={<Target className="h-3.5 w-3.5" />}>
          <div className="flex flex-wrap gap-1.5">
            {ALL_REALMS.map((realm) => {
              const isSelected = selectedInterests.includes(realm);
              const color = getRealmColor(realm);
              return (
                <button
                  key={realm}
                  onClick={() => toggleInterest(realm)}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition-all",
                    isSelected
                      ? "text-white border-transparent shadow-soft"
                      : "text-foreground border-border bg-card hover:border-primary/40",
                  )}
                  style={isSelected ? { backgroundColor: color } : undefined}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: isSelected ? "hsl(var(--primary-foreground))" : color,
                      opacity: isSelected ? 0.7 : 1,
                    }}
                  />
                  {getRealmLabel(realm)}
                </button>
              );
            })}
          </div>
          {selectedInterests.length === 0 && (
            <p className="text-xs text-warning mt-2">분야를 1개 이상 선택해주세요</p>
          )}
        </PanelSection>

        {/* 검색 반경 */}
        <PanelSection title="검색 반경" icon={<Compass className="h-3.5 w-3.5" />}>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map((r) => (
              <Button
                key={r}
                variant={radius === r ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setRadius(r)}
              >
                {r}km
              </Button>
            ))}
          </div>
        </PanelSection>

        <div className="px-5 pb-4">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={isLoading || !school || selectedInterests.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI 분석 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI 추천 받기
              </>
            )}
          </Button>
        </div>

        {error && !isLoading && (
          <div className="mx-5 mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Claude가 최적 조합을 분석 중입니다...
              </p>
              <p className="text-xs text-muted-foreground/70">약 10~20초 소요</p>
            </div>
          </div>
        )}

        {result && !isLoading && (
          <>
            <PanelSection title="AI 분석 결과" hint={`${result.total}개 분석`}>
              <div className="rounded-lg bg-card border border-border p-4">
                <AIMarkdown content={result.recommendation} />
              </div>
            </PanelSection>

            <PanelSection title="주변 학원 목록" hint={`${result.academies.length}개`}>
              <div className="space-y-1.5">
                {result.academies.map((academy) => {
                  const realmColor = getRealmColor(academy.realm || "");
                  return (
                    <div
                      key={academy.id}
                      className="rounded-md border border-border bg-card p-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {academy.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 min-w-0">
                            {academy.realm && (
                              <span
                                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white shrink-0"
                                style={{ backgroundColor: realmColor }}
                              >
                                {getRealmLabel(academy.realm)}
                              </span>
                            )}
                            {academy.subject && (
                              <span className="text-xs text-muted-foreground truncate">
                                {academy.subject}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground tabular-nums">
                            {academy.tuitionFee ? formatTuition(academy.tuitionFee) : "—"}
                            {academy.tuitionFee && <span className="text-xs text-muted-foreground">원</span>}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatDistance(academy.distance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PanelSection>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import { Sparkles, AlertCircle, RefreshCcw, Lightbulb, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface ReportData {
  summary: string;
  realm_analysis: Array<{
    realm: string;
    count: number;
    ratio: number;
    avg_ratio: number;
    insight: string;
  }>;
  school_suggestions: Array<{
    program: string;
    reason: string;
    target: string;
  }>;
  parent_info: string;
  data_note: string;
}

interface AIReportProps {
  regionKey: string;
  autoLoad?: boolean;
}

export default function AIReport({ regionKey, autoLoad = false }: AIReportProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionKey }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "리포트 생성 실패");
      }
      const data = await res.json();
      const reportContent =
        typeof data.reportContent === "string"
          ? JSON.parse(data.reportContent)
          : data.reportContent;
      setReport(reportContent);
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 리포트를 생성할 수 없습니다");
    } finally {
      setIsLoading(false);
    }
  }, [regionKey]);

  useEffect(() => {
    if (autoLoad && !isLoaded && !isLoading && !error) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, isLoaded, isLoading, error]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/20" />
          <Skeleton width="w-40" height="h-4" />
        </div>
        <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
          <Skeleton width="w-24" height="h-4" />
          <Skeleton height="h-3" />
          <Skeleton width="w-4/5" height="h-3" />
          <Skeleton width="w-3/5" height="h-3" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-secondary/40 p-3 space-y-2">
            <Skeleton width="w-20" height="h-3" />
            <Skeleton height="h-3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={generateReport}>
          <RefreshCcw className="h-3.5 w-3.5" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (!report && !isLoaded) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="font-serif-display text-base font-semibold text-foreground mb-1">
          AI 분석 리포트
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          이 지역의 사교육 현황을 Claude가 분석합니다
        </p>
        <Button onClick={generateReport}>
          <Sparkles className="h-4 w-4" />
          리포트 생성하기
        </Button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-5">
      <Badge variant="soft" className="gap-1.5">
        <Sparkles className="h-3 w-3" />
        Claude가 분석한 리포트
      </Badge>

      {/* 요약 */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          사교육 현황 요약
        </h4>
        <p className="text-sm text-foreground/85 leading-relaxed">{report.summary}</p>
      </div>

      {/* 분야별 분석 */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          분야별 분석
        </h4>
        <div className="space-y-2">
          {report.realm_analysis.map((item) => (
            <div key={item.realm} className="rounded-md bg-secondary/40 border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{item.realm}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {item.count}개 ({(item.ratio * 100).toFixed(1)}%)
                </span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{item.insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 방과후 제안 */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4 text-warning" />
          방과후 프로그램 제안
        </h4>
        <div className="space-y-2">
          {report.school_suggestions.map((s, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-success/30 bg-success/5 p-3"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0",
                    "bg-success text-success-foreground",
                  )}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-semibold text-foreground">{s.program}</h5>
                  <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{s.reason}</p>
                  <Badge variant="outline" className="mt-1.5 text-[10px] h-4 px-1.5">
                    대상: {s.target}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 학부모 안내 */}
      <div className="rounded-lg bg-warning/5 border border-warning/30 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Users className="h-4 w-4 text-warning" />
          학부모 참고 정보
        </h4>
        <p className="text-sm text-foreground/85 leading-relaxed">{report.parent_info}</p>
      </div>

      {/* 데이터 한계 */}
      <div className="rounded-md bg-muted/40 border border-border p-3">
        <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {report.data_note}
        </p>
      </div>
    </div>
  );
}

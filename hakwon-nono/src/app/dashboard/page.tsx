"use client";

import { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Building2, GraduationCap, BarChart3, MapPin } from "lucide-react";
import PageShell from "@/components/layout/PageShell";
import RealmPieChart from "@/components/charts/RealmPieChart";
import { StatSkeleton } from "@/components/ui/Skeleton";
import Skeleton from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import CommandSearch from "@/components/layout/CommandSearch";
import { useCmdK } from "@/lib/hooks/useCmdK";

interface NationalStats {
  totalAcademies: number;
  totalSchools: number;
  bySido: Array<{ sido: string; count: number }>;
  byRealm: Array<{ realm: string; count: number }>;
  topDense: Array<{ sido: string; sigungu: string; count: number }>;
}

const SIDO_COLORS = [
  "#D97757", "#A78232", "#9333EA", "#0891B2", "#16A34A",
  "#2563EB", "#EC4899", "#EA580C", "#0D9488", "#CA8A04",
  "#84CC16", "#D946EF", "#A855F7", "#0EA5E9", "#22C55E",
  "#E11D48", "#7C3AED",
];

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (latest) => Math.round(latest).toLocaleString());

  useEffect(() => {
    const controls = animate(motionVal, value, { duration: 1.1, ease: "easeOut" });
    return controls.stop;
  }, [value, motionVal]);

  useEffect(() => {
    return rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [rounded]);

  return <span ref={ref} className="tabular-nums">0</span>;
}

const BarTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload || !payload[0]) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-overlay">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-sm font-bold text-primary tabular-nums">
        {payload[0].value.toLocaleString()}개
      </p>
    </div>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<NationalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  useCmdK(() => setCmdOpen(true));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/districts/stats");
        if (!res.ok) throw new Error("통계 조회 실패");
        const data = await res.json();
        setStats(data);
      } catch {
        setError("전국 통계 데이터를 불러올 수 없습니다");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const sortedSido = stats ? [...stats.bySido].sort((a, b) => b.count - a.count) : [];

  return (
    <PageShell
      title="전국 사교육 한눈에 보기"
      description="전국 21만 개 학원·교습소와 1만 1천여 학교의 시도별·분야별 분포 현황입니다."
      onOpenSearch={() => setCmdOpen(true)}
    >
      <CommandSearch open={cmdOpen} onOpenChange={setCmdOpen} />

      {isLoading && (
        <div className="space-y-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-lg border border-border bg-card p-6">
              <Skeleton width="w-40" height="h-5" className="mb-4" />
              <Skeleton height="h-[400px]" />
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <Skeleton width="w-40" height="h-5" className="mb-4" />
              <Skeleton height="h-[400px]" />
            </div>
          </div>
        </div>
      )}

      {error && !isLoading && (
        <p className="text-center py-16 text-muted-foreground">{error}</p>
      )}

      {stats && !isLoading && (
        <motion.div
          className="space-y-7"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* KPI 카드 */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI
              icon={<Building2 className="h-4 w-4" />}
              tone="primary"
              label="전국 학원 수"
              value={stats.totalAcademies}
            />
            <KPI
              icon={<GraduationCap className="h-4 w-4" />}
              tone="success"
              label="전국 학교 수"
              value={stats.totalSchools}
            />
            <KPI
              icon={<BarChart3 className="h-4 w-4" />}
              tone="accent"
              label="분야 수"
              value={stats.byRealm.length}
            />
            <KPI
              icon={<MapPin className="h-4 w-4" />}
              tone="warning"
              label="시도 수"
              value={stats.bySido.length}
            />
          </motion.div>

          {/* 차트 행 */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif-display text-base">시도별 학원 수</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sortedSido} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v: number) => v.toLocaleString()}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="sido"
                      tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      width={75}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--secondary))" }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {sortedSido.map((_, i) => (
                        <Cell key={i} fill={SIDO_COLORS[i % SIDO_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif-display text-base">분야별 분포</CardTitle>
              </CardHeader>
              <CardContent>
                <RealmPieChart data={stats.byRealm} height={400} innerRadius={70} outerRadius={130} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 10 밀집 */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif-display text-base">학원 밀집도 Top 10 시군구</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <Th className="w-12">#</Th>
                        <Th>시도</Th>
                        <Th>시군구</Th>
                        <Th align="right">학원 수</Th>
                        <Th className="w-1/3">비율</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stats.topDense.map((item, i) => {
                        const max = stats.topDense[0]?.count || 1;
                        const w = (item.count / max) * 100;
                        return (
                          <tr key={`${item.sido}-${item.sigungu}`} className="hover:bg-secondary/40 transition-colors">
                            <td className="py-2.5 px-3">
                              <span
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                                  i < 3
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground",
                                )}
                              >
                                {i + 1}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">{item.sido}</td>
                            <td className="py-2.5 px-3 font-medium text-foreground">{item.sigungu}</td>
                            <td className="py-2.5 px-3 text-right font-semibold text-foreground tabular-nums">
                              {item.count.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
                                  style={{ width: `${w}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </PageShell>
  );
}

function KPI({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "primary" | "success" | "accent" | "warning";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    accent: "bg-accent/15 text-accent-foreground",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5 mb-2">
        <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-md", tones[tone])}>
          {icon}
        </span>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="font-serif-display text-3xl font-semibold text-foreground">
        <AnimatedNumber value={value} />
      </p>
    </Card>
  );
}

function Th({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "py-2.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

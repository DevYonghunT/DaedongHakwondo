type ScoreGaugeProps = {
  score: number;
  label: string;
};

export function ScoreGauge({ score, label }: ScoreGaugeProps) {
  return (
    <div className="rounded-lg border border-sky-100 bg-sky-50 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-950">
            {score}
          </p>
        </div>
        <span className="text-sm text-slate-500">/100</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-sky-500"
          style={{ width: `${Math.max(0, Math.min(score, 100))}%` }}
        />
      </div>
    </div>
  );
}

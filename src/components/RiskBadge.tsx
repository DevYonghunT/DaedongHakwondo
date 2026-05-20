import { RISK_BADGE_CLASSES, RISK_LABELS } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { RiskType } from "@/lib/types";

type RiskBadgeProps = {
  risk: RiskType;
};

export function RiskBadge({ risk }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
        RISK_BADGE_CLASSES[risk]
      )}
    >
      {RISK_LABELS[risk]}
    </span>
  );
}

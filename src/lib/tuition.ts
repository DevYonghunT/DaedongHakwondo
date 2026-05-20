export type ParsedTuition = {
  monthlyFee: number | null;
  disclosed: boolean;
  reason: "parsed" | "undisclosed" | "empty" | "no-number";
};

const WON_UNITS = [
  { pattern: /(\d+(?:\.\d+)?)\s*만원/g, multiplier: 10000 },
  { pattern: /(\d+(?:,\d{3})+|\d+)\s*원/g, multiplier: 1 }
];

export function parseMonthlyTuition(input: string | null | undefined): ParsedTuition {
  const value = input?.trim();

  if (!value) {
    return { monthlyFee: null, disclosed: false, reason: "empty" };
  }

  if (/비공개|미공개|공개\s*안함|해당없음|없음/i.test(value)) {
    return { monthlyFee: null, disclosed: false, reason: "undisclosed" };
  }

  const normalized = value.replace(/\s+/g, " ");
  const detected: number[] = [];

  for (const unit of WON_UNITS) {
    for (const match of normalized.matchAll(unit.pattern)) {
      const raw = match[1]?.replaceAll(",", "");
      const amount = Number(raw);
      if (Number.isFinite(amount) && amount > 0) {
        detected.push(Math.round(amount * unit.multiplier));
      }
    }
  }

  if (detected.length === 0) {
    const numberMatch = normalized.match(/(\d+(?:,\d{3})+|\d+)/);
    if (!numberMatch) {
      return { monthlyFee: null, disclosed: true, reason: "no-number" };
    }

    const numeric = Number(numberMatch[1].replaceAll(",", ""));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return { monthlyFee: null, disclosed: true, reason: "no-number" };
    }

    return {
      monthlyFee: numeric < 1000 ? numeric * 10000 : numeric,
      disclosed: true,
      reason: "parsed"
    };
  }

  return {
    monthlyFee: Math.max(...detected),
    disclosed: true,
    reason: "parsed"
  };
}

export function formatWon(value: number | null | undefined) {
  if (value == null) {
    return "비공개";
  }

  return `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`;
}

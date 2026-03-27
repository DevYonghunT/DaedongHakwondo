'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { memo } from 'react';
import { getRealmColor, getRealmLabel } from '@/lib/constants';

/** 바차트 데이터 항목 */
interface RegionBarData {
  realm: string;
  ratio: number;      // 해당 지역 비율
  avgRatio: number;    // 시도 평균 비율
}

interface RegionBarChartProps {
  data: RegionBarData[];
  height?: number;
}

// 커스텀 툴팁
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    color: string;
  }>;
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
      <p className="text-sm font-medium text-gray-800 mb-2">
        {getRealmLabel(label || '') || label}
      </p>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-600">
            {item.name}: {(item.value * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
};

/** 지역별 비율 비교 바 차트 컴포넌트 */
function RegionBarChart({ data, height = 300 }: RegionBarChartProps) {
  // 데이터 가공: 레이블 축약
  const chartData = data.map((item) => ({
    ...item,
    label: getRealmLabel(item.realm),
    ratioPercent: item.ratio * 100,
    avgRatioPercent: item.avgRatio * 100,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          tick={{ fontSize: 12, fill: '#9CA3AF' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: '#4B5563' }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-gray-600">{value}</span>
          )}
        />
        <Bar
          dataKey="ratioPercent"
          name="해당 지역"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.realm}
              fill={getRealmColor(entry.realm)}
            />
          ))}
        </Bar>
        <Bar
          dataKey="avgRatioPercent"
          name="시도 평균"
          fill="#D1D5DB"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 불필요한 리렌더링 방지를 위한 메모이제이션 */
export default memo(RegionBarChart);

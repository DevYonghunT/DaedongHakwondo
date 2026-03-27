'use client';

import { memo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getRealmColor, getRealmLabel } from '@/lib/constants';

/** 파이차트 데이터 항목 */
interface RealmPieData {
  realm: string;
  count: number;
}

interface RealmPieChartProps {
  data: RealmPieData[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

// 커스텀 툴팁
const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: RealmPieData & { percent: number };
  }>;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  const color = getRealmColor(item.name);

  return (
    <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium text-gray-800">
          {getRealmLabel(item.name)}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">
        {item.value.toLocaleString()}개
        <span className="text-gray-400 ml-1">
          ({((item.payload.percent || 0) * 100).toFixed(1)}%)
        </span>
      </p>
    </div>
  );
};

// 커스텀 레전드
const CustomLegend = ({
  payload,
}: {
  payload?: Array<{ value: string; color: string }>;
}) => {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-600">
            {getRealmLabel(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/** 분야별 파이 차트 컴포넌트 */
function RealmPieChart({
  data,
  height = 280,
  showLegend = true,
  innerRadius = 50,
  outerRadius = 90,
}: RealmPieChartProps) {
  // 데이터 가공: 비율 계산
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const chartData = data
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      percent: total > 0 ? item.count / total : 0,
    }))
    .sort((a, b) => b.count - a.count);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="count"
          nameKey="realm"
          strokeWidth={2}
          stroke="#fff"
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.realm}
              fill={getRealmColor(entry.realm)}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend content={<CustomLegend />} />}

        {/* 중앙 텍스트 (도넛 차트일 때) */}
        {innerRadius > 0 && (
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-800"
          >
            <tspan x="50%" dy="-8" fontSize="22" fontWeight="bold">
              {total.toLocaleString()}
            </tspan>
            <tspan x="50%" dy="20" fontSize="12" className="fill-gray-500">
              전체
            </tspan>
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

/** 불필요한 리렌더링 방지를 위한 메모이제이션 */
export default memo(RealmPieChart);

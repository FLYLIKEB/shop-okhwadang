'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RevenueChartItem } from '@/lib/api';

interface DashboardChartsProps {
  data: RevenueChartItem[];
}

function formatCurrency(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만`;
  }
  return value.toLocaleString();
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[1]}/${parts[2]}`;
}

export function RevenueLineChart({ data }: DashboardChartsProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-lg font-semibold">매출 추이</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
          <YAxis tickFormatter={formatCurrency} fontSize={12} />
          <Tooltip
            formatter={(value) => [
              `${Number(value).toLocaleString()}원`,
              '매출',
            ]}
            labelFormatter={(label) => `날짜: ${String(label)}`}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OrderBarChart({ data }: DashboardChartsProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-lg font-semibold">주문 수 추이</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip
            formatter={(value) => [`${Number(value)}건`, '주문 수']}
            labelFormatter={(label) => `날짜: ${String(label)}`}
          />
          <Bar dataKey="order_count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

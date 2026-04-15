'use client';

import { useCallback } from 'react';
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
import { formatCurrency } from '@/utils/currency';

interface DashboardChartsProps {
  data: RevenueChartItem[];
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[1]}/${parts[2]}`;
}

function formatYAxisRevenue(value: number): string {
  return formatCurrency(value, 'ko', { abbreviated: true });
}

function formatLabel(label: unknown): string {
  return `날짜: ${String(label)}`;
}

export function RevenueLineChart({ data }: DashboardChartsProps) {
  const formatTooltipRevenue = useCallback(
    (value: unknown) => [formatCurrency(Number(value)), '매출'] as [string, string],
    [],
  );

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-lg font-semibold">매출 추이</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
          <YAxis tickFormatter={formatYAxisRevenue} fontSize={12} />
          <Tooltip
            formatter={formatTooltipRevenue}
            labelFormatter={formatLabel}
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
  const formatTooltipOrders = useCallback(
    (value: unknown) => [`${Number(value)}건`, '주문 수'] as [string, string],
    [],
  );

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-lg font-semibold">주문 수 추이</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip
            formatter={formatTooltipOrders}
            labelFormatter={formatLabel}
          />
          <Bar dataKey="order_count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DashboardCharts({ data }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <RevenueLineChart data={data} />
      <OrderBarChart data={data} />
    </div>
  );
}

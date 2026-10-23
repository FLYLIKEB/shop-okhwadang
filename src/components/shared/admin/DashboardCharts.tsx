'use client';

import { localMessage } from '@/utils/localMessages';
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
  return localMessage('adminEnglish.chartDate', { date: String(label) });
}

export function RevenueLineChart({ data }: DashboardChartsProps) {
  const formatTooltipRevenue = useCallback(
    (value: unknown) => [formatCurrency(Number(value)), localMessage('adminEnglish.revenue')] as [string, string],
    [],
  );

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-lg font-semibold">{localMessage('adminEnglish.revenueTrend')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} stroke="var(--color-muted-foreground)" />
          <YAxis tickFormatter={formatYAxisRevenue} fontSize={12} stroke="var(--color-muted-foreground)" />
          <Tooltip
            formatter={formatTooltipRevenue}
            labelFormatter={formatLabel}
            contentStyle={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-card-foreground)' }}
            itemStyle={{ color: 'var(--color-card-foreground)' }}
            cursor={{ stroke: 'var(--color-border)', fill: 'var(--color-muted)' }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--color-primary)"
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
    (value: unknown) => [localMessage('adminEnglish.chartOrders', { count: Number(value) }), localMessage('adminEnglish.orders')] as [string, string],
    [],
  );

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-4 text-lg font-semibold">{localMessage('adminEnglish.orderTrend')}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} stroke="var(--color-muted-foreground)" />
          <YAxis fontSize={12} stroke="var(--color-muted-foreground)" />
          <Tooltip
            formatter={formatTooltipOrders}
            labelFormatter={formatLabel}
            contentStyle={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-card-foreground)' }}
            itemStyle={{ color: 'var(--color-card-foreground)' }}
            cursor={{ stroke: 'var(--color-border)', fill: 'var(--color-muted)' }}
          />
          <Bar dataKey="order_count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
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

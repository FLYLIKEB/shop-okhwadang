'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { handleApiError } from '@/utils/error';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { formatCurrency } from '@/utils/currency';
import {
  adminDashboardApi,
  type DashboardResponse,
  type DashboardQueryParams,
} from '@/lib/api';
import { ORDER_STATUS_LABELS } from '@/constants/status';

const RevenueLineChart = dynamic(
  () =>
    import('@/components/admin/DashboardCharts').then(
      (mod) => mod.RevenueLineChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

const OrderBarChart = dynamic(
  () =>
    import('@/components/admin/DashboardCharts').then(
      (mod) => mod.OrderBarChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return (
    <div className="flex h-80 items-center justify-center rounded-lg border">
      <span className="text-sm text-muted-foreground">차트 로딩 중...</span>
    </div>
  );
}



const PERIOD_OPTIONS = [
  { value: 'today', label: '오늘' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
  { value: 'custom', label: '직접입력' },
];

interface KpiCardProps {
  label: string;
  value: string;
  diffPct: number;
  unit?: string;
}

function KpiCard({ label, value, diffPct, unit }: KpiCardProps) {
  const isPositive = diffPct > 0;
  const isZero = diffPct === 0;

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        {value}
        {unit && <span className="ml-1 text-base font-normal">{unit}</span>}
      </p>
      <p
        className={`mt-1 text-sm ${
          isZero
            ? 'text-muted-foreground'
            : isPositive
              ? 'text-green-600'
              : 'text-red-600'
        }`}
      >
        {isZero ? '-' : `${isPositive ? '+' : ''}${diffPct}%`}
        {!isZero && (
          <span className="ml-1 text-muted-foreground">전일 대비</span>
        )}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { isAdmin } = useAdminGuard();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { execute: fetchDashboard, isLoading: loading } = useAsyncAction(
    async () => {
      setError(null);
      const params: DashboardQueryParams = {};
      if (period === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      } else if (period !== 'custom') {
        params.period = period;
      }
      const result = await adminDashboardApi.get(params);
      setData(result);
    },
    {
      errorMessage: '대시보드 데이터를 불러올 수 없습니다',
      onError: (err) => setError(handleApiError(err, '대시보드 데이터를 불러올 수 없습니다')),
    },
  );

  useEffect(() => {
    if (!isAdmin) return;
    if (period === 'custom' && (!customStart || !customEnd)) return;
    void fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, period, customStart, customEnd]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                period === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="mb-4 flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
          />
          <span className="text-muted-foreground">~</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
          />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <span className="text-sm text-muted-foreground">로딩 중...</span>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="오늘 매출"
              value={formatCurrency(data.kpi.today_revenue)}
              diffPct={data.kpi.today_revenue_diff_pct}
            />
            <KpiCard
              label="오늘 주문수"
              value={data.kpi.today_orders.toLocaleString()}
              diffPct={data.kpi.today_orders_diff_pct}
              unit="건"
            />
            <KpiCard
              label="신규 회원수"
              value={data.kpi.new_members_today.toLocaleString()}
              diffPct={data.kpi.new_members_diff_pct}
              unit="명"
            />
            <KpiCard
              label="상품 조회수"
              value={data.kpi.total_product_views.toLocaleString()}
              diffPct={0}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RevenueLineChart data={data.revenue_chart} />
            <OrderBarChart data={data.revenue_chart} />
          </div>

          {/* Order Status Summary */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-lg font-semibold">주문 상태별 현황</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {Object.entries(data.order_status_summary).map(
                ([status, count]) => (
                  <div
                    key={status}
                    className="rounded-md bg-muted p-3 text-center"
                  >
                    <p className="text-sm text-muted-foreground">
                      {ORDER_STATUS_LABELS[status] ?? status}
                    </p>
                    <p className="mt-1 text-xl font-bold">{count}</p>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-lg font-semibold">최근 주문 5건</h3>
            {data.recent_orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                주문 내역이 없습니다
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-3 py-2 font-medium">주문번호</th>
                      <th className="px-3 py-2 font-medium">고객명</th>
                      <th className="px-3 py-2 font-medium text-right">
                        결제금액
                      </th>
                      <th className="px-3 py-2 font-medium">상태</th>
                      <th className="px-3 py-2 font-medium">주문일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_orders.map((order) => (
                      <tr
                        key={order.order_number}
                        className="border-b last:border-0"
                      >
                        <td className="px-3 py-2 font-mono text-xs">
                          {order.order_number}
                        </td>
                        <td className="px-3 py-2">{order.user_name}</td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {ORDER_STATUS_LABELS[order.status] ?? order.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(
                            'ko-KR',
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

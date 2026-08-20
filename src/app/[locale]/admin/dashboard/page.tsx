'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { handleApiError } from '@/utils/error';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { formatCurrency } from '@/utils/currency';
import {
  adminDashboardApi,
  type DashboardResponse,
  type DashboardQueryParams,
} from '@/lib/api';
import { ORDER_STATUS_LABELS } from '@/constants/status';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/shared/admin/AdminStates';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';


const DashboardCharts = dynamic(
  () => import('@/components/shared/admin/DashboardCharts'),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return (
    <div className="surface-card flex h-80 items-center justify-center">
      <span className="typo-body-sm text-muted-foreground">차트 로딩 중...</span>
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
    <div className="surface-card p-4">
      <p className="typo-body-sm text-muted-foreground">{label}</p>
      <p className="typo-h2 mt-1">
        {value}
        {unit && <span className="ml-1 typo-body font-normal">{unit}</span>}
      </p>
      <p
        className={`mt-1 typo-body-sm ${
          isZero
            ? 'text-muted-foreground'
            : isPositive
              ? 'text-green-600'
              : 'text-red-600'
        }`}
      >
        {isZero ? '-' : `${isPositive ? '+' : ''}${diffPct}%`}
        {!isZero && (
          <span className="ml-1 typo-body-sm text-muted-foreground">전일 대비</span>
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
    <div className="space-y-6">
      <AdminPageHeader
        title="대시보드"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={period === opt.value ? 'primary' : 'gray'}
                onClick={() => setPeriod(opt.value)}
                aria-pressed={period === opt.value}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        }
      />

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="surface-card border-soft bg-background px-3 py-2 typo-body-sm"
          />
          <span className="text-muted-foreground">~</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="surface-card border-soft bg-background px-3 py-2 typo-body-sm"
          />
        </div>
      )}

      {error && <AdminErrorState title={error} />}

      {loading && !data ? (
        <AdminLoadingState title="로딩 중..." />
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
            <KpiCard
              label="탈퇴 예정"
              value={(data.kpi.deletion_pending_count ?? 0).toLocaleString()}
              diffPct={0}
              unit="명"
            />
            <KpiCard
              label="탈퇴 완료"
              value={(data.kpi.deletion_completed_count ?? 0).toLocaleString()}
              diffPct={0}
              unit="명"
            />
          </div>

          {/* Charts */}
          <DashboardCharts data={data.revenue_chart} />

          {/* Order Status Summary */}
          <div className="surface-card p-4">
            <h3 className="mb-4 typo-h3">주문 상태별 현황</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {Object.entries(data.order_status_summary).map(
                ([status, count]) => (
                  <div
                    key={status}
                    className="rounded-md bg-muted p-3 text-center"
                  >
                    <p className="typo-body-sm text-muted-foreground">
                      {ORDER_STATUS_LABELS[status] ?? status}
                    </p>
                    <p className="mt-1 typo-h3">{count}</p>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="surface-card p-4">
            <h3 className="mb-4 typo-h3">최근 주문 5건</h3>
            {data.recent_orders.length === 0 ? (
              <AdminEmptyState title="주문 내역이 없습니다" className="border-0 p-4" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full typo-body-sm">
                  <thead>
                    <tr className="border-soft border-b text-left">
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
                        className="border-soft border-b last:border-0"
                      >
                        <td className="px-3 py-2 font-mono typo-label">
                          {order.order_number}
                        </td>
                        <td className="px-3 py-2">{order.user_name}</td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(order.total_amount)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-muted px-2 py-0.5 typo-label">
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

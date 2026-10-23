'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { handleApiError } from '@/utils/error';
import { useAsyncAction } from '@/components/shared/hooks/useAsyncAction';
import { useAdminGuard } from '@/components/shared/hooks/useAdminGuard';
import { formatCurrency, type Locale } from '@/utils/currency';
import {
  adminDashboardApi,
  type DashboardResponse,
  type DashboardQueryParams,
} from '@/lib/api';
import { ORDER_STATUS_LABELS } from '@/constants/status';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/shared/admin/AdminStates';
import { AdminPageHeader } from '@/components/shared/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { formatCount, formatDate } from '@/utils/date';

const DashboardCharts = dynamic(
  () => import('@/components/shared/admin/DashboardCharts'),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  const t = useTranslations('admin.dashboard');
  return (
    <div className="surface-card flex h-80 items-center justify-center">
      <span className="typo-body-sm text-muted-foreground">{t('chartLoading')}</span>
    </div>
  );
}


const PERIOD_OPTIONS = ['today', '7d', '30d', '90d', 'custom'] as const;

interface KpiCardProps {
  label: string;
  value: string;
  diffPct: number;
  unit?: string;
  comparison: string;
}

function KpiCard({ label, value, diffPct, unit, comparison }: KpiCardProps) {
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
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
        }`}
      >
        {isZero ? '-' : `${isPositive ? '+' : ''}${diffPct}%`}
        {!isZero && (
          <span className="ml-1 typo-body-sm text-muted-foreground">{comparison}</span>
        )}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('admin.dashboard');
  const locale = useLocale() as Locale;
  const { isAdmin } = useAdminGuard();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const incompleteCustomRange = period === 'custom' && (!customStart || !customEnd);
  const { execute: fetchDashboard } = useAsyncAction(
    async ({ params, isCurrent }: { params: DashboardQueryParams; isCurrent: () => boolean }) => {
      try {
        const result = await adminDashboardApi.get(params);
        if (isCurrent()) setData(result);
      } catch (err) {
        if (!isCurrent()) return;
        setError(handleApiError(err, t('loadError')));
        throw err;
      }
    },
    { errorMessage: t('loadError') },
  );

  useEffect(() => {
    let current = true;
    setData(null);
    setError(null);
    if (isAdmin && !incompleteCustomRange) {
      const params: DashboardQueryParams = period === 'custom'
        ? { startDate: customStart, endDate: customEnd }
        : { period };
      void fetchDashboard({ params, isCurrent: () => current });
    }
    return () => { current = false; };
  }, [isAdmin, period, customStart, customEnd, incompleteCustomRange, fetchDashboard]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('title')}
        description={t('scopeDescription')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt}
                type="button"
                size="sm"
                variant={period === opt ? 'primary' : 'gray'}
                onClick={() => setPeriod(opt)}
                aria-pressed={period === opt}
              >
                {t(`period.${opt}`)}
              </Button>
            ))}
          </div>
        }
      />

      {period === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label={t('startDate')}
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="surface-card border-soft bg-background px-3 py-2 typo-body-sm"
          />
          <span className="text-muted-foreground">~</span>
          <input
            type="date"
            aria-label={t('endDate')}
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="surface-card border-soft bg-background px-3 py-2 typo-body-sm"
          />
        </div>
      )}

      {error && <AdminErrorState title={error} />}

      {incompleteCustomRange ? (
        <AdminEmptyState title={t('selectDates')} />
      ) : !data && !error ? (
        <AdminLoadingState title={t('loading')} />
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <KpiCard
              label={t('periodRevenue')}
              value={formatCurrency(data.kpi.today_revenue)}
              comparison={t('comparePreviousPeriod')}
              diffPct={data.kpi.today_revenue_diff_pct}
            />
            <KpiCard
              label={t('periodOrders')}
              value={formatCount(data.kpi.today_orders, locale)}
              comparison={t('comparePreviousPeriod')}
              diffPct={data.kpi.today_orders_diff_pct}
              unit={t('orderUnit')}
            />
            <KpiCard
              label={t('newMembers')}
              value={formatCount(data.kpi.new_members_today, locale)}
              comparison={t('comparePreviousPeriod')}
              diffPct={data.kpi.new_members_diff_pct}
              unit={t('memberUnit')}
            />
            <KpiCard
              label={t('cumulativeProductViews')}
              value={formatCount(data.kpi.total_product_views, locale)}
              comparison={t('comparePreviousPeriod')}
              diffPct={0}
            />
            <KpiCard
              label={t('currentDeletionPending')}
              value={formatCount(data.kpi.deletion_pending_count ?? 0, locale)}
              comparison={t('comparePreviousPeriod')}
              diffPct={0}
              unit={t('memberUnit')}
            />
            <KpiCard
              label={t('cumulativeDeletionCompleted')}
              value={formatCount(data.kpi.deletion_completed_count ?? 0, locale)}
              comparison={t('comparePreviousPeriod')}
              diffPct={0}
              unit={t('memberUnit')}
            />
          </div>

          {/* Charts */}
          <DashboardCharts data={data.revenue_chart} />

          {/* Order Status Summary */}
          <div className="surface-card p-4">
            <h3 className="mb-4 typo-h3">{t('orderStatusSummary')}</h3>
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
            <h3 className="mb-4 typo-h3">{t('recentOrders')}</h3>
            {data.recent_orders.length === 0 ? (
              <AdminEmptyState title={t('noOrders')} className="border-0 p-4" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full typo-body-sm">
                  <thead>
                    <tr className="border-soft border-b text-left">
                      <th className="px-3 py-2 font-medium">{t('columns.orderNumber')}</th>
                      <th className="px-3 py-2 font-medium">{t('columns.customerName')}</th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t('columns.paymentAmount')}
                      </th>
                      <th className="px-3 py-2 font-medium">{t('columns.status')}</th>
                      <th className="px-3 py-2 font-medium">{t('columns.orderDate')}</th>
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
                          {formatDate(order.created_at, locale)}
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

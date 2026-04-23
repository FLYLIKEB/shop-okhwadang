import { apiClient } from '../core';

export interface DashboardKpi {
  today_revenue: number;
  today_revenue_diff_pct: number;
  today_orders: number;
  today_orders_diff_pct: number;
  new_members_today: number;
  new_members_diff_pct: number;
  total_product_views: number;
}

export interface RevenueChartItem {
  date: string;
  revenue: number;
  order_count: number;
}

export interface OrderStatusSummary {
  pending: number;
  paid: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
}

export interface DashboardRecentOrder {
  order_number: string;
  user_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface DashboardResponse {
  kpi: DashboardKpi;
  revenue_chart: RevenueChartItem[];
  order_status_summary: OrderStatusSummary;
  recent_orders: DashboardRecentOrder[];
}

export interface DashboardQueryParams {
  startDate?: string;
  endDate?: string;
  period?: string;
}

export const adminDashboardApi = {
  get: (params?: DashboardQueryParams) =>
    apiClient.get<DashboardResponse>('/admin/dashboard', {
      params: params as Record<string, string | undefined>,
    }),
};

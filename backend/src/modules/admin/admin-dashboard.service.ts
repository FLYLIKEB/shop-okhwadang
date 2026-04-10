import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

interface KpiData {
  today_revenue: number;
  today_revenue_diff_pct: number;
  today_orders: number;
  today_orders_diff_pct: number;
  new_members_today: number;
  new_members_diff_pct: number;
  total_product_views: number;
}

interface RevenueChartItem {
  date: string;
  revenue: number;
  order_count: number;
}

interface OrderStatusSummary {
  pending: number;
  paid: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
}

interface RecentOrder {
  order_number: string;
  user_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface DashboardResponse {
  kpi: KpiData;
  revenue_chart: RevenueChartItem[];
  order_status_summary: OrderStatusSummary;
  recent_orders: RecentOrder[];
}

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getDashboard(query: DashboardQueryDto): Promise<DashboardResponse> {
    const { startDate, endDate } = this.resolveDateRange(query);

    const [kpi, revenueChart, orderStatusSummary, recentOrders] =
      await Promise.all([
        this.getKpi(),
        this.getRevenueChart(startDate, endDate),
        this.getOrderStatusSummary(),
        this.getRecentOrders(),
      ]);

    return {
      kpi,
      revenue_chart: revenueChart,
      order_status_summary: orderStatusSummary,
      recent_orders: recentOrders,
    };
  }

  private resolveDateRange(query: DashboardQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);

      const diffMs = endDate.getTime() - startDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > 365) {
        throw new BadRequestException('기간은 최대 365일까지 설정 가능합니다');
      }
      if (diffDays < 0) {
        throw new BadRequestException(
          '시작일은 종료일보다 이전이어야 합니다',
        );
      }
    } else {
      const days = this.parsePeriodDays(query.period);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  private parsePeriodDays(period?: string): number {
    switch (period) {
      case 'today':
        return 0;
      case '7d':
        return 7;
      case '90d':
        return 90;
      case '30d':
      default:
        return 30;
    }
  }

  private async getKpi(): Promise<KpiData> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setMilliseconds(-1);

    const excludedStatuses = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

    const [todayAgg, yesterdayAgg, todayMembers, yesterdayMembers, viewCountResult] =
      await Promise.all([
        this.orderRepository
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
          .addSelect('COUNT(*)', 'count')
          .where('o.createdAt BETWEEN :start AND :end', { start: todayStart, end: todayEnd })
          .andWhere('o.status NOT IN (:...statuses)', { statuses: excludedStatuses })
          .getRawOne() as Promise<{ revenue: string; count: string }>,
        this.orderRepository
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
          .addSelect('COUNT(*)', 'count')
          .where('o.createdAt BETWEEN :start AND :end', { start: yesterdayStart, end: yesterdayEnd })
          .andWhere('o.status NOT IN (:...statuses)', { statuses: excludedStatuses })
          .getRawOne() as Promise<{ revenue: string; count: string }>,
        this.userRepository.count({
          where: { createdAt: Between(todayStart, todayEnd) },
        }),
        this.userRepository.count({
          where: { createdAt: Between(yesterdayStart, yesterdayEnd) },
        }),
        this.productRepository
          .createQueryBuilder('product')
          .select('SUM(product.viewCount)', 'total')
          .getRawOne() as Promise<{ total: string | null }>,
      ]);

    const todayRevenue = Number(todayAgg?.revenue ?? 0);
    const yesterdayRevenue = Number(yesterdayAgg?.revenue ?? 0);
    const todayOrderCount = Number(todayAgg?.count ?? 0);
    const yesterdayOrderCount = Number(yesterdayAgg?.count ?? 0);

    return {
      today_revenue: todayRevenue,
      today_revenue_diff_pct: this.calcDiffPct(todayRevenue, yesterdayRevenue),
      today_orders: todayOrderCount,
      today_orders_diff_pct: this.calcDiffPct(
        todayOrderCount,
        yesterdayOrderCount,
      ),
      new_members_today: todayMembers,
      new_members_diff_pct: this.calcDiffPct(todayMembers, yesterdayMembers),
      total_product_views: Number(viewCountResult?.total ?? 0),
    };
  }

  private calcDiffPct(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private async getRevenueChart(
    startDate: Date,
    endDate: Date,
  ): Promise<RevenueChartItem[]> {
    const excludedStatuses = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

    const rows = await this.orderRepository
      .createQueryBuilder('o')
      .select('DATE(o.createdAt)', 'date')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'count')
      .where('o.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
      .andWhere('o.status NOT IN (:...statuses)', { statuses: excludedStatuses })
      .groupBy('DATE(o.createdAt)')
      .getRawMany() as { date: string; revenue: string; count: string }[];

    const dailyMap = new Map<string, { revenue: number; count: number }>();

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      dailyMap.set(dateStr, { revenue: 0, count: 0 });
      current.setDate(current.getDate() + 1);
    }

    for (const row of rows) {
      if (!row.date) continue;
      const dateStr = typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date).toISOString().split('T')[0];
      if (dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { revenue: Number(row.revenue), count: Number(row.count) });
      }
    }

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      order_count: data.count,
    }));
  }

  private async getOrderStatusSummary(): Promise<OrderStatusSummary> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany<{ status: string; count: string }>();

    const summary: OrderStatusSummary = {
      pending: 0,
      paid: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    };

    for (const row of result) {
      const status = row.status as keyof OrderStatusSummary;
      if (status in summary) {
        summary[status] = Number(row.count);
      }
    }

    return summary;
  }

  private async getRecentOrders(): Promise<RecentOrder[]> {
    const orders = await this.orderRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return orders.map((order) => ({
      order_number: order.orderNumber,
      user_name: order.user?.name ?? '알 수 없음',
      total_amount: Number(order.totalAmount),
      status: order.status,
      created_at: order.createdAt.toISOString(),
    }));
  }
}

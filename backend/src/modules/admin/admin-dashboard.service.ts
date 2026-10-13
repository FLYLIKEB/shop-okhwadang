import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { DashboardPeriod, DashboardQueryDto } from './dto/dashboard-query.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

interface KpiData {
  // Response names stay stable for API compatibility; values use the selected dashboard range.
  today_revenue: number;
  today_revenue_diff_pct: number;
  today_orders: number;
  today_orders_diff_pct: number;
  new_members_today: number;
  new_members_diff_pct: number;
  total_product_views: number;
  deletion_pending_count: number;
  deletion_completed_count: number;
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
  completed: number;
  cancelled: number;
  refund_requested: number;
  refunded: number;
}

interface RecentOrder {
  order_number: string;
  user_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface DashboardDateRange {
  startDate: Date;
  endExclusiveDate: Date;
  startSql: string;
  endExclusiveSql: string;
  previousStartSql: string;
  previousEndExclusiveSql: string;
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
    const dateRange = this.resolveDateRange(query);

    const [kpi, revenueChart, orderStatusSummary, recentOrders] =
      await Promise.all([
        this.getKpi(dateRange),
        this.getRevenueChart(dateRange.startDate, dateRange.endExclusiveDate),
        this.getOrderStatusSummary(dateRange.startDate, dateRange.endExclusiveDate),
        this.getRecentOrders(dateRange.startDate, dateRange.endExclusiveDate),
      ]);

    return {
      kpi,
      revenue_chart: revenueChart,
      order_status_summary: orderStatusSummary,
      recent_orders: recentOrders,
    };
  }

  private resolveDateRange(query: DashboardQueryDto): DashboardDateRange {
    const hasStartDate = query.startDate !== undefined;
    const hasEndDate = query.endDate !== undefined;
    let startDate: Date;
    let endExclusiveDate: Date;
    let dayCount: number;

    if (hasStartDate || hasEndDate) {
      if (!query.startDate || !query.endDate) {
        throw new BadRequestException('시작일과 종료일을 모두 입력해야 합니다');
      }

      startDate = this.parseDateOnlyStart(query.startDate, '시작일');
      const endDateStart = this.parseDateOnlyStart(query.endDate, '종료일');
      endExclusiveDate = this.addUtcDays(endDateStart, 1);

      dayCount = this.countInclusiveDays(startDate, endDateStart);
      if (dayCount < 1) {
        throw new BadRequestException(
          '시작일은 종료일보다 이전이어야 합니다',
        );
      }
      if (dayCount > 365) {
        throw new BadRequestException('기간은 최대 365일까지 설정 가능합니다');
      }
    } else {
      dayCount = this.parsePeriodDayCount(query.period);
      const todayStart = this.toUtcStartOfDay(new Date());
      startDate = new Date(todayStart.getTime() - (dayCount - 1) * DAY_MS);
      endExclusiveDate = this.addUtcDays(todayStart, 1);
    }

    const previousStartDate = new Date(startDate.getTime() - dayCount * DAY_MS);

    return {
      startDate,
      endExclusiveDate,
      startSql: this.formatUtcSqlDateTime(startDate),
      endExclusiveSql: this.formatUtcSqlDateTime(endExclusiveDate),
      previousStartSql: this.formatUtcSqlDateTime(previousStartDate),
      previousEndExclusiveSql: this.formatUtcSqlDateTime(startDate),
    };
  }

  private parsePeriodDayCount(period?: DashboardPeriod | string): number {
    switch (period) {
      case 'today':
        return 1;
      case '7d':
        return 7;
      case '90d':
        return 90;
      case '30d':
      case undefined:
        return 30;
      default:
        throw new BadRequestException('지원하지 않는 기간입니다');
    }
  }

  private parseDateOnlyStart(value: string, label: string): Date {
    const match = DATE_ONLY_RE.exec(value);
    if (!match) {
      throw new BadRequestException(`${label}은 YYYY-MM-DD 형식이어야 합니다`);
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new BadRequestException(`${label}이 올바른 날짜가 아닙니다`);
    }

    return date;
  }

  private toUtcStartOfDay(date: Date): Date {
    return new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ));
  }

  private addUtcDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
  }

  private formatUtcSqlDateTime(date: Date): string {
    return [
      [
        date.getUTCFullYear(),
        String(date.getUTCMonth() + 1).padStart(2, '0'),
        String(date.getUTCDate()).padStart(2, '0'),
      ].join('-'),
      [
        String(date.getUTCHours()).padStart(2, '0'),
        String(date.getUTCMinutes()).padStart(2, '0'),
        String(date.getUTCSeconds()).padStart(2, '0'),
      ].join(':'),
    ].join(' ') + `.${String(date.getUTCMilliseconds()).padStart(3, '0')}`;
  }

  private countInclusiveDays(startDate: Date, endDateStart: Date): number {
    return Math.floor((endDateStart.getTime() - startDate.getTime()) / DAY_MS) + 1;
  }

  private async getKpi(dateRange: DashboardDateRange): Promise<KpiData> {
    const excludedStatuses = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

    const [currentAgg, previousAgg, currentMembers, previousMembers, viewCountResult, deletionPendingCount, deletionCompletedCount] =
      await Promise.all([
        this.orderRepository
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
          .addSelect('COUNT(*)', 'count')
          .where('o.createdAt >= :start AND o.createdAt < :end', { start: dateRange.startSql, end: dateRange.endExclusiveSql })
          .andWhere('o.status NOT IN (:...statuses)', { statuses: excludedStatuses })
          .getRawOne() as Promise<{ revenue: string; count: string }>,
        this.orderRepository
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
          .addSelect('COUNT(*)', 'count')
          .where('o.createdAt >= :start AND o.createdAt < :end', { start: dateRange.previousStartSql, end: dateRange.previousEndExclusiveSql })
          .andWhere('o.status NOT IN (:...statuses)', { statuses: excludedStatuses })
          .getRawOne() as Promise<{ revenue: string; count: string }>,
        this.userRepository.count({
          where: {
            createdAt: this.createdAtInRange(dateRange.startSql, dateRange.endExclusiveSql),
          },
        }),
        this.userRepository.count({
          where: {
            createdAt: this.createdAtInRange(
              dateRange.previousStartSql,
              dateRange.previousEndExclusiveSql,
            ),
          },
        }),
        this.productRepository
          .createQueryBuilder('product')
          .select('SUM(product.viewCount)', 'total')
          .getRawOne() as Promise<{ total: string | null }>,
        this.userRepository
          .createQueryBuilder('user')
          .where('user.deletionScheduledAt IS NOT NULL')
          .andWhere('user.deletedAt IS NULL')
          .getCount(),
        this.userRepository
          .createQueryBuilder('user')
          .where('user.deletedAt IS NOT NULL')
          .getCount(),
      ]);

    const todayRevenue = Number(currentAgg?.revenue ?? 0);
    const yesterdayRevenue = Number(previousAgg?.revenue ?? 0);
    const todayOrderCount = Number(currentAgg?.count ?? 0);
    const yesterdayOrderCount = Number(previousAgg?.count ?? 0);

    return {
      today_revenue: todayRevenue,
      today_revenue_diff_pct: this.calcDiffPct(todayRevenue, yesterdayRevenue),
      today_orders: todayOrderCount,
      today_orders_diff_pct: this.calcDiffPct(
        todayOrderCount,
        yesterdayOrderCount,
      ),
      new_members_today: currentMembers,
      new_members_diff_pct: this.calcDiffPct(currentMembers, previousMembers),
      total_product_views: Number(viewCountResult?.total ?? 0),
      deletion_pending_count: deletionPendingCount,
      deletion_completed_count: deletionCompletedCount,
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
    endExclusiveDate: Date,
  ): Promise<RevenueChartItem[]> {
    const excludedStatuses = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

    const rows = await this.orderRepository
      .createQueryBuilder('o')
      .select("DATE_FORMAT(o.createdAt, '%Y-%m-%d')", 'date')
      .addSelect('COALESCE(SUM(o.totalAmount), 0)', 'revenue')
      .addSelect('COUNT(*)', 'count')
      .where('o.createdAt >= :start AND o.createdAt < :end', {
        start: this.formatUtcSqlDateTime(startDate),
        end: this.formatUtcSqlDateTime(endExclusiveDate),
      })
      .andWhere('o.status NOT IN (:...statuses)', { statuses: excludedStatuses })
      .groupBy("DATE_FORMAT(o.createdAt, '%Y-%m-%d')")
      .getRawMany() as { date: string; revenue: string; count: string }[];

    const dailyMap = new Map<string, { revenue: number; count: number }>();

    const current = new Date(startDate);
    while (current < endExclusiveDate) {
      const dateStr = current.toISOString().split('T')[0];
      dailyMap.set(dateStr, { revenue: 0, count: 0 });
      current.setUTCDate(current.getUTCDate() + 1);
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

  private async getOrderStatusSummary(
    startDate: Date,
    endExclusiveDate: Date,
  ): Promise<OrderStatusSummary> {
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.createdAt >= :start AND order.createdAt < :end', {
        start: this.formatUtcSqlDateTime(startDate),
        end: this.formatUtcSqlDateTime(endExclusiveDate),
      })
      .groupBy('order.status')
      .getRawMany<{ status: string; count: string }>();

    const summary: OrderStatusSummary = {
      pending: 0,
      paid: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0,
      refund_requested: 0,
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

  private async getRecentOrders(
    startDate: Date,
    endExclusiveDate: Date,
  ): Promise<RecentOrder[]> {
    const orders = await this.orderRepository.find({
      where: {
        createdAt: this.createdAtInRange(
          this.formatUtcSqlDateTime(startDate),
          this.formatUtcSqlDateTime(endExclusiveDate),
        ),
      },
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

  private createdAtInRange(start: string, end: string) {
    return Raw((alias) => `${alias} >= :start AND ${alias} < :end`, {
      start,
      end,
    });
  }
}

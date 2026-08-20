'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { OrderResponse, Product } from '@/lib/api';
import { formatCurrency, type Locale } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import StatusBadge from '@/components/shared/common/StatusBadge';
import { OrderProductList } from './OrderProductList';

interface OrderSummaryCardProps {
  order: OrderResponse;
  products: Map<number, Product>;
  locale: Locale;
  href: string;
  moreLabel?: string;
}

export function OrderSummaryCard({ order, products, locale, href, moreLabel }: OrderSummaryCardProps) {
  return (
    <Link href={href} className="toss-account__order-card block surface-card p-5 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="toss-account__order-number typo-body-sm font-semibold">{order.orderNumber}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="typo-label mt-1 text-muted-foreground">{formatDate(order.createdAt, locale)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="typo-body-sm font-semibold">{formatCurrency(Number(order.totalAmount), locale)}</p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <OrderProductList
        items={order.items}
        products={products}
        locale={locale}
        limit={1}
        moreLabel={moreLabel}
      />
    </Link>
  );
}

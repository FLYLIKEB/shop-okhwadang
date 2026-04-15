'use client';

import type { CartItem } from '@/lib/api';
import { formatCurrency } from '@/utils/currency';
import type { Locale } from '@/i18n/routing';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/constants/shipping';

interface OrderSummarySectionProps {
  checkoutItems: CartItem[];
  locale: Locale;
}

export function OrderSummarySection({
  checkoutItems,
  locale,
}: OrderSummarySectionProps) {
  const totalAmount = checkoutItems.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = totalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const grandTotal = totalAmount + shippingFee;

  return (
    <section className="rounded-lg border p-6 space-y-4 lg:sticky lg:top-24">
      <h2 className="typo-h3">주문 상품</h2>

      <ul className="divide-y text-sm">
        {checkoutItems.map((item) => (
          <li key={item.id} className="py-3 space-y-0.5">
            <p className="font-medium">{item.product.name}</p>
            {item.option && (
              <p className="text-muted-foreground text-xs">
                {item.option.name}: {item.option.value}
              </p>
            )}
            <p className="text-muted-foreground">
              {formatCurrency(item.unitPrice, locale)} × {item.quantity}개 ={' '}
              {formatCurrency(item.subtotal, locale)}
            </p>
          </li>
        ))}
      </ul>

      <div className="border-t pt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">상품 금액</span>
          <span>{formatCurrency(totalAmount, locale)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">배송비</span>
          <span>{shippingFee === 0 ? '무료' : formatCurrency(shippingFee, locale)}</span>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between typo-h3">
          <span>합계</span>
          <span>{formatCurrency(grandTotal, locale)}</span>
        </div>
      </div>
    </section>
  );
}
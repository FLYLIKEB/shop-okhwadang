'use client';

import Image from 'next/image';
import type { OrderItemResponse, Product } from '@/lib/api';
import { formatCurrency, type Locale } from '@/utils/currency';

interface OrderProductListProps {
  items: OrderItemResponse[];
  products: Map<number, Product>;
  locale: Locale;
  moreLabel?: string;
  limit?: number;
}

export function OrderProductList({
  items,
  products,
  locale,
  moreLabel,
  limit = 3,
}: OrderProductListProps) {
  return (
    <div className="toss-account__recent-items grid gap-2">
      {items.slice(0, limit).map((item) => {
        const product = products.get(item.productId);
        const thumbnail = product?.images.find((image) => image.isThumbnail)?.url ?? product?.images[0]?.url;

        return (
          <div key={item.id} className="toss-account__recent-item flex items-center gap-3 rounded-xl p-2">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={item.productName}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-1 text-center typo-label text-muted-foreground">
                  {item.productName.slice(0, 2)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="toss-account__recent-item-name typo-body-sm font-semibold">{item.productName}</p>
              {item.optionName && <p className="typo-label mt-0.5 text-muted-foreground">{item.optionName}</p>}
              <p className="typo-label mt-1 text-muted-foreground">
                {formatCurrency(Number(item.price), locale)} · {item.quantity}
              </p>
            </div>
          </div>
        );
      })}
      {items.length > limit && moreLabel && (
        <p className="typo-label px-2 text-muted-foreground">{moreLabel}</p>
      )}
    </div>
  );
}

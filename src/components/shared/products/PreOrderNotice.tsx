'use client';

import { localMessage } from '@/utils/localMessages';
import type { Locale } from '@/utils/currency';

interface PreOrderNoticeProps {
  isPreOrder?: boolean;
  preOrderShippingDate?: string | null;
  imageOverlay?: boolean;
  locale?: Locale;
}

export default function PreOrderNotice({ isPreOrder, preOrderShippingDate, imageOverlay = false, locale }: PreOrderNoticeProps) {
  if (!isPreOrder) return null;
  if (imageOverlay) {
    return (
      <p className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 typo-label leading-relaxed text-white">
        <span className="shrink-0 font-semibold">{localMessage('preOrder.cardBadge', undefined, locale)}</span>
        {preOrderShippingDate && (
          <time dateTime={preOrderShippingDate} className="ml-auto text-right">
            {localMessage('preOrder.shippingDate', { date: preOrderShippingDate }, locale)}
          </time>
        )}
      </p>
    );
  }
  return (
    <p className="typo-label leading-relaxed text-muted-foreground">
      <span className="font-semibold text-foreground">{localMessage('preOrder.badge')}</span>
      {preOrderShippingDate && <> · {localMessage('preOrder.shippingDate', { date: preOrderShippingDate })}</>}
    </p>
  );
}

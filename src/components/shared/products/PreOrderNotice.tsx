'use client';

import { localMessage } from '@/utils/localMessages';

interface PreOrderNoticeProps {
  isPreOrder?: boolean;
  preOrderShippingDate?: string | null;
}

export default function PreOrderNotice({ isPreOrder, preOrderShippingDate }: PreOrderNoticeProps) {
  if (!isPreOrder) return null;
  return (
    <p className="typo-label leading-relaxed text-muted-foreground">
      <span className="font-semibold text-foreground">{localMessage('preOrder.badge')}</span>
      {preOrderShippingDate && <> · {localMessage('preOrder.shippingDate', { date: preOrderShippingDate })}</>}
    </p>
  );
}

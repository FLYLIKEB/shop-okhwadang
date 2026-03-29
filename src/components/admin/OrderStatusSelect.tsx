'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { adminOrdersApi } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  pending: '결제대기',
  paid: '결제완료',
  preparing: '상품준비중',
  shipped: '배송중',
  delivered: '배송완료',
  cancelled: '주문취소',
  refunded: '환불완료',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid'],
  paid: ['preparing', 'cancelled', 'refunded'],
  preparing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: [],
  cancelled: [],
  refunded: [],
};

interface OrderStatusSelectProps {
  orderId: number;
  currentStatus: string;
  onStatusChange: () => void;
}

export function OrderStatusSelect({ orderId, currentStatus, onStatusChange }: OrderStatusSelectProps) {
  const [updating, setUpdating] = useState(false);
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  const handleChange = async (nextStatus: string) => {
    if (!nextStatus || nextStatus === currentStatus) return;

    setUpdating(true);
    try {
      await adminOrdersApi.updateStatus(orderId, nextStatus);
      toast.success(`주문 상태가 ${STATUS_LABELS[nextStatus]}(으)로 변경되었습니다.`);
      onStatusChange();
    } catch {
      toast.error('상태 변경에 실패했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  if (allowedNext.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {STATUS_LABELS[currentStatus] ?? currentStatus}
      </span>
    );
  }

  return (
    <select
      disabled={updating}
      value=""
      onChange={(e) => void handleChange(e.target.value)}
      className="rounded border bg-background px-2 py-1 text-xs disabled:opacity-50"
    >
      <option value="">{STATUS_LABELS[currentStatus] ?? currentStatus}</option>
      {allowedNext.map((s) => (
        <option key={s} value={s}>
          → {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

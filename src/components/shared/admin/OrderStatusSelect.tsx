'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { adminOrdersApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { ORDER_STATUS_LABELS } from '@/constants/status';
import { toastMessage } from '@/utils/toastMessages';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid'],
  paid: ['preparing', 'refunded'],
  preparing: ['shipped', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['completed', 'refund_requested'],
  completed: [],
  cancelled: [],
  refund_requested: ['refunded'],
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
      toast.success(toastMessage('orderStatusChanged', { status: ORDER_STATUS_LABELS[nextStatus] ?? nextStatus }));
      onStatusChange();
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('statusChangeError')));
    } finally {
      setUpdating(false);
    }
  };

  if (allowedNext.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {ORDER_STATUS_LABELS[currentStatus] ?? currentStatus}
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
      <option value="">{ORDER_STATUS_LABELS[currentStatus] ?? currentStatus}</option>
      {allowedNext.map((s) => (
        <option key={s} value={s}>
          → {ORDER_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

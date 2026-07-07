'use client';

import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { adminOrdersApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { localMessage } from '@/utils/localMessages';

interface CancelOrderModalProps {
  orderId: number;
  orderNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelOrderModal({ orderId, orderNumber, onClose, onSuccess }: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      toast.error(localMessage('admin.orders.cancel.reasonRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await adminOrdersApi.cancelOrder(orderId, { reason: trimmedReason });
      toast.success(localMessage('admin.orders.cancel.success'));
      onSuccess();
    } catch (err) {
      toast.error(handleApiError(err, localMessage('admin.orders.cancel.error')));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title">
      <form onSubmit={(event) => void handleSubmit(event)} className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <div className="space-y-1">
          <h2 id="cancel-order-title" className="text-lg font-semibold">
            {localMessage('admin.orders.cancel.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {localMessage('admin.orders.cancel.description', { orderNumber })}
          </p>
        </div>

        <label className="mt-4 block text-sm font-medium" htmlFor="cancel-reason">
          {localMessage('admin.orders.cancel.reasonLabel')}
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          rows={5}
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={localMessage('admin.orders.cancel.reasonPlaceholder')}
          disabled={isSubmitting}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{reason.length}/500</p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"
          >
            {localMessage('admin.orders.cancel.close')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? localMessage('admin.orders.cancel.submitting') : localMessage('admin.orders.cancel.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { adminOrdersApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { toastMessage } from '@/utils/toastMessages';
import Modal from '@/components/ui/Modal';

interface ShippingModalProps {
  orderId: number;
  orderNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CARRIERS = [
  { value: 'cj', label: 'CJ대한통운' },
  { value: 'hanjin', label: '한진택배' },
  { value: 'lotte', label: '롯데택배' },
  { value: 'mock', label: '테스트(Mock)' },
];

export function ShippingModal({ orderId, orderNumber, onClose, onSuccess }: ShippingModalProps) {
  const [carrier, setCarrier] = useState('cj');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      toast.error(toastMessage('trackingNumberRequired'));
      return;
    }

    setSubmitting(true);
    try {
      await adminOrdersApi.registerShipping(orderId, {
        carrier,
        trackingNumber: trackingNumber.trim(),
      });
      toast.success(toastMessage('trackingRegistered'));
      onSuccess();
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('trackingRegisterError')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} maxWidth="md" ariaLabelledBy="shipping-modal-title">
      <h2 id="shipping-modal-title" className="mb-4 text-lg font-bold">
        운송장 등록
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">주문번호: {orderNumber}</p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">택배사</label>
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {CARRIERS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">운송장 번호</label>
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="운송장 번호 입력"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-secondary"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

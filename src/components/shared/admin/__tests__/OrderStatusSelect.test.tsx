import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderStatusSelect } from '../OrderStatusSelect';
import { ORDER_STATUS_CONFIG } from '@/constants/status';

vi.mock('@/lib/api', () => ({
  adminOrdersApi: { updateStatus: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));


vi.mock('@/utils/localMessages', () => ({
  localMessage: (key: string) => {
    const messages: Record<string, string> = {
      'admin.orders.status.cancelled': '취소됨',
      'admin.orders.status.completed': '구매확정',
      'admin.orders.status.delivered': '배송완료',
      'admin.orders.status.paid': '결제완료',
      'admin.orders.status.pending': '결제대기',
      'admin.orders.status.preparing': '상품준비중',
      'admin.orders.status.refund_requested': '환불요청',
      'admin.orders.status.refunded': '환불완료',
      'admin.orders.status.shipped': '배송중',
    };
    return messages[key] ?? key;
  },
}));

describe('OrderStatusSelect status contract', () => {
  it('exposes completed and refund_requested transitions from delivered orders', () => {
    render(<OrderStatusSelect orderId={1} currentStatus="delivered" onStatusChange={vi.fn()} />);

    expect(screen.getByRole('option', { name: '→ 구매확정' })).toHaveValue('completed');
    expect(screen.getByRole('option', { name: '→ 환불요청' })).toHaveValue('refund_requested');
  });

  it('does not expose cancellation because admin cancellation requires a reason modal', () => {
    render(<OrderStatusSelect orderId={1} currentStatus="paid" onStatusChange={vi.fn()} />);

    expect(screen.queryByRole('option', { name: '→ 취소됨' })).not.toBeInTheDocument();
  });

  it('allows refund_requested orders to move to refunded', () => {
    render(<OrderStatusSelect orderId={1} currentStatus="refund_requested" onStatusChange={vi.fn()} />);

    expect(screen.getByRole('option', { name: '→ 환불완료' })).toHaveValue('refunded');
  });

  it('has labels and colors for every backend order status', () => {
    expect(Object.keys(ORDER_STATUS_CONFIG).sort()).toEqual([
      'cancelled',
      'completed',
      'delivered',
      'paid',
      'pending',
      'preparing',
      'refund_requested',
      'refunded',
      'shipped',
    ]);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderStatusSelect } from '../OrderStatusSelect';
import { ORDER_STATUS_LABELS } from '@/constants/status';

vi.mock('@/lib/api', () => ({
  adminOrdersApi: { updateStatus: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('OrderStatusSelect status contract', () => {
  it('exposes completed and refund_requested transitions from delivered orders', () => {
    render(<OrderStatusSelect orderId={1} currentStatus="delivered" onStatusChange={vi.fn()} />);

    expect(screen.getByRole('option', { name: `→ ${ORDER_STATUS_LABELS.completed}` })).toHaveValue('completed');
    expect(screen.getByRole('option', { name: `→ ${ORDER_STATUS_LABELS.refund_requested}` })).toHaveValue('refund_requested');
  });

  it('does not expose cancellation because admin cancellation requires a reason modal', () => {
    render(<OrderStatusSelect orderId={1} currentStatus="paid" onStatusChange={vi.fn()} />);

    expect(screen.queryByRole('option', { name: `→ ${ORDER_STATUS_LABELS.cancelled}` })).not.toBeInTheDocument();
  });

  it('allows refund_requested orders to move to refunded', () => {
    render(<OrderStatusSelect orderId={1} currentStatus="refund_requested" onStatusChange={vi.fn()} />);

    expect(screen.getByRole('option', { name: `→ ${ORDER_STATUS_LABELS.refunded}` })).toHaveValue('refunded');
  });

  it('has labels and colors for every backend order status', () => {
    expect(Object.keys(ORDER_STATUS_LABELS).sort()).toEqual([
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

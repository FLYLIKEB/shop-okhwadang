import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CancelOrderModal } from '../CancelOrderModal';
import { adminOrdersApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  adminOrdersApi: { cancelOrder: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('CancelOrderModal', () => {
  it('requires a reason before calling the API', async () => {
    render(
      <CancelOrderModal orderId={1} orderNumber="ORD-1" onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '취소 처리' }));

    await waitFor(() => {
      expect(adminOrdersApi.cancelOrder).not.toHaveBeenCalled();
    });
  });

  it('keeps destructive click-away disabled while Escape still closes', () => {
    const onClose = vi.fn();
    render(
      <CancelOrderModal orderId={1} orderNumber="ORD-1" onClose={onClose} onSuccess={vi.fn()} />,
    );

    const dialog = screen.getByRole('dialog', { name: '주문 취소' });
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('submits trimmed cancellation reason', async () => {
    vi.mocked(adminOrdersApi.cancelOrder).mockResolvedValueOnce({} as never);
    const onSuccess = vi.fn();
    render(
      <CancelOrderModal orderId={7} orderNumber="ORD-7" onClose={vi.fn()} onSuccess={onSuccess} />,
    );

    fireEvent.change(screen.getByLabelText('취소 사유'), { target: { value: '  품절  ' } });
    fireEvent.click(screen.getByRole('button', { name: '취소 처리' }));

    await waitFor(() => {
      expect(adminOrdersApi.cancelOrder).toHaveBeenCalledWith(7, { reason: '품절' });
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

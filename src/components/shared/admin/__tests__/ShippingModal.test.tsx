import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShippingModal } from '../ShippingModal';

vi.mock('@/lib/api', () => ({
  adminOrdersApi: { registerShipping: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('ShippingModal', () => {
  it('uses the shared dialog shell with title label and Escape close', () => {
    const onClose = vi.fn();

    render(<ShippingModal orderId={1} orderNumber="ORD-1" onClose={onClose} onSuccess={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: '운송장 등록' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledOnce();
  });
});

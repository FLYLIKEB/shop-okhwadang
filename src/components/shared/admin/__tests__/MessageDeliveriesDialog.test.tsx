import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageDeliveriesDialog } from '../MessageDeliveriesDialog';
import { adminOrdersApi } from '@/lib/api';

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/api', () => ({
  adminOrdersApi: {
    getMessageDeliveries: vi.fn(),
    reconcileMessageDelivery: vi.fn(),
  },
}));

const log = {
  id: 1,
  eventType: 'shipping.started',
  channel: 'sms',
  provider: 'solapi',
  templateKey: 'shipping.started',
  providerMessageId: null,
  effectKey: 'message-effect:7',
  status: 'manual_review',
  errorMessage: null,
  sentAt: null,
  createdAt: '2026-10-05T00:00:00.000Z',
  recipientPhoneMasked: '010****5678',
};

describe('MessageDeliveriesDialog', () => {
  beforeEach(() => {
    vi.mocked(adminOrdersApi.getMessageDeliveries).mockResolvedValue({ logs: [log], effects: [] });
    vi.mocked(adminOrdersApi.reconcileMessageDelivery).mockResolvedValue({ reconciled: true });
  });

  it('shows masked delivery details and requires provider evidence before reconciliation', async () => {
    render(<MessageDeliveriesDialog orderId={5} orderNumber="ORD-5" onClose={vi.fn()} />);

    expect(await screen.findByText(/010\*\*\*\*5678/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'reconcileAction' }));
    const confirm = screen.getByRole('button', { name: 'confirm' });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('providerId'), { target: { value: ' provider-42 ' } });
    fireEvent.change(screen.getByLabelText('reason'), { target: { value: ' SOLAPI console verified ' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(adminOrdersApi.reconcileMessageDelivery).toHaveBeenCalledWith(5, 'message-effect:7', {
      reason: 'SOLAPI console verified',
      providerMessageId: 'provider-42',
    }));
  });

  it('does not offer reconciliation for ordinary failures', async () => {
    vi.mocked(adminOrdersApi.getMessageDeliveries).mockResolvedValue({ logs: [{ ...log, status: 'failed' }], effects: [] });
    render(<MessageDeliveriesDialog orderId={5} orderNumber="ORD-5" onClose={vi.fn()} />);

    expect(await screen.findByText(/010\*\*\*\*5678/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'reconcileAction' })).not.toBeInTheDocument();
  });

  it('does not open reconciliation without an effect key', async () => {
    vi.mocked(adminOrdersApi.getMessageDeliveries).mockResolvedValue({ logs: [{ ...log, effectKey: null }], effects: [] });
    render(<MessageDeliveriesDialog orderId={5} orderNumber="ORD-5" onClose={vi.fn()} />);

    expect(await screen.findByText(/010\*\*\*\*5678/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'reconcileAction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'confirm' })).not.toBeInTheDocument();
  });

  it('offers reconciliation when an accepted log has an unresolved outbox effect', async () => {
    vi.mocked(adminOrdersApi.getMessageDeliveries).mockResolvedValue({
      logs: [{ ...log, status: 'sent' }],
      effects: [{
        id: 7, effectKey: 'message-effect:7', eventType: 'shipping.started',
        state: 'MANUAL_REVIEW', attemptCount: 8, nextAttemptAt: null,
        lastError: null, createdAt: '2026-10-05T00:00:00.000Z',
      }],
    });
    render(<MessageDeliveriesDialog orderId={5} orderNumber="ORD-5" onClose={vi.fn()} />);

    expect(await screen.findByRole('button', { name: 'reconcileAction' })).toBeInTheDocument();
  });
});

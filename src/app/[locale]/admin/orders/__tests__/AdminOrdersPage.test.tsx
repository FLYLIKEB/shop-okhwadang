import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import ko from '@/i18n/messages/ko.json';
import AdminOrdersPage from '../page';

const api = vi.hoisted(() => ({ getList: vi.fn(), getServiceRequests: vi.fn(), updateServiceRequest: vi.fn() }));
vi.mock('@/lib/api', () => ({ adminOrdersApi: api }));
vi.mock('@/components/shared/hooks/useAdminGuard', () => ({ useAdminGuard: () => ({ isAdmin: true }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const request = (id: number, status = 'requested') => ({
  id, orderId: id, userId: 1, type: 'cancel', status, reason: `request-${id}`,
  createdAt: '2026-10-20T00:00:00Z',
});

function showPage() {
  return render(<NextIntlClientProvider locale="ko" messages={ko}><AdminOrdersPage /></NextIntlClientProvider>);
}

describe('admin order service request workflow', () => {
  beforeEach(() => {
    api.getList.mockResolvedValue({ items: [], total: 0 });
    api.getServiceRequests.mockResolvedValue({ items: [request(1)], total: 1 });
    api.updateServiceRequest.mockResolvedValue({});
  });

  it('keeps approval pending until the server responds, then allows completion from approved', async () => {
    let approve: () => void = () => {};
    api.updateServiceRequest.mockImplementationOnce(() => new Promise<void>((resolve) => { approve = resolve; }));
    api.getServiceRequests.mockImplementation(async ({ status }: { status: string }) => ({
      items: [request(1, status)], total: 1,
    }));
    showPage();
    fireEvent.click(await screen.findByRole('button', { name: ko.admin.orders.approveRequest }));
    expect(screen.getByRole('button', { name: ko.admin.orders.completeRequest })).toBeDisabled();
    expect(api.updateServiceRequest).toHaveBeenCalledTimes(1);
    await act(async () => approve());
    await waitFor(() => expect(api.getServiceRequests).toHaveBeenCalledWith({ status: 'approved', page: 1, limit: 10 }));
    await waitFor(() => expect(screen.getByRole('button', { name: ko.admin.orders.completeRequest })).toBeEnabled());
    expect(screen.queryByRole('button', { name: ko.admin.orders.approveRequest })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: ko.admin.orders.completeRequest }));
    await waitFor(() => expect(api.updateServiceRequest).toHaveBeenLastCalledWith(1, { status: 'completed' }));
  });

  it('loads the eleventh request through server pagination', async () => {
    api.getServiceRequests.mockImplementation(async ({ page }: { page: number }) => ({
      items: page === 1 ? Array.from({ length: 10 }, (_, index) => request(index + 1)) : [request(11)],
      total: 11,
    }));
    showPage();
    fireEvent.click(await screen.findByRole('button', { name: '2' }));
    await waitFor(() => expect(api.getServiceRequests).toHaveBeenLastCalledWith({ status: 'requested', page: 2, limit: 10 }));
    expect(await screen.findByText(/request-11/)).toBeInTheDocument();
  });

  it('reports a deferred completion failure and keeps the request actionable', async () => {
    let reject: (error: Error) => void = () => {};
    api.getServiceRequests.mockResolvedValue({ items: [request(1, 'approved')], total: 1 });
    api.updateServiceRequest.mockImplementationOnce(() => new Promise<void>((_resolve, rejectPromise) => { reject = rejectPromise; }));
    showPage();
    const complete = await screen.findByRole('button', { name: ko.admin.orders.completeRequest });
    fireEvent.click(complete);
    expect(complete).toBeDisabled();
    await act(async () => reject(new Error('Gateway cancellation failed')));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: ko.admin.orders.completeRequest })).toBeEnabled();
    expect(api.updateServiceRequest).toHaveBeenCalledTimes(1);
    expect(toast.success).not.toHaveBeenCalled();
  });
});

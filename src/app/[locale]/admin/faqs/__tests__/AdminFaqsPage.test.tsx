import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminFaqsPage from '../page';
import { adminFaqsApi } from '@/lib/api';
import { localMessage } from '@/utils/localMessages';

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({
  useAdminGuard: () => ({ isAdmin: true }),
}));
vi.mock('@/lib/api', () => ({
  adminFaqsApi: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(adminFaqsApi.getAll).mockResolvedValue([]);
});

describe('English FAQ labels', () => {
  it('shows English category names while preserving Korean API category values', async () => {
    render(<AdminFaqsPage />);
    await waitFor(() => expect(adminFaqsApi.getAll).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: localMessage('adminEnglish.newFaq') }));
    const category = screen.getByLabelText(localMessage('product.filter.category'));
    expect(screen.getByRole('option', { name: localMessage('faqPage.categories.shipping') })).toHaveValue('배송');
    fireEvent.change(category, { target: { value: '결제' } });
    fireEvent.change(screen.getByPlaceholderText(localMessage('adminEnglish.enterAFrequentlyAskedQuestion')), { target: { value: 'How can I pay?' } });
    fireEvent.change(screen.getByPlaceholderText(localMessage('adminEnglish.enterAnAnswer')), { target: { value: 'Use the checkout payment options.' } });
    vi.mocked(adminFaqsApi.create).mockResolvedValue({ id: 1, category: '결제', question: 'How can I pay?', answer: 'Use the checkout payment options.', sortOrder: 0, isPublished: true } as Awaited<ReturnType<typeof adminFaqsApi.create>>);
    fireEvent.click(screen.getByRole('button', { name: localMessage('admin.reviews.import.summary.create') }));
    await waitFor(() => expect(adminFaqsApi.create).toHaveBeenCalledWith(expect.objectContaining({ category: '결제' })));
  });
});

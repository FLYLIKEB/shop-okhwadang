import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminCouponsPage from '../page';

const mockUseAdminGuard = vi.fn();
const mockGetList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockIssue = vi.fn();

const translate = (key: string, values?: Record<string, string | number>) => {
  if (key === 'summary' && values) return `summary:${values.count}`;
  return key;
};

vi.mock('next-intl', () => ({
  useTranslations: () => translate,
  useLocale: () => 'ko',
}));

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({
  useAdminGuard: () => mockUseAdminGuard(),
}));

vi.mock('@/lib/api', () => ({
  adminCouponsApi: {
    getList: (...args: unknown[]) => mockGetList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    issue: (...args: unknown[]) => mockIssue(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('AdminCouponsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminGuard.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      isLoading: false,
      isAdmin: true,
    });
mockGetList.mockImplementation((params?: { page?: number; limit?: number }) => {
  const page = params?.page ?? 1;

  if (page === 2) {
    return Promise.resolve({
      items: [
        {
          id: 21,
          code: 'WELCOME20',
          name: '재방문 20%',
          type: 'percentage',
          value: 20,
          minOrderAmount: 10000,
          maxDiscount: 8000,
          totalQuantity: 50,
          issuedCount: 0,
          startsAt: '2026-07-25T00:00:00.000Z',
          expiresAt: '2026-08-25T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-07-24T00:00:00.000Z',
        },
      ],
      total: 21,
      page: 2,
      limit: 20,
    });
  }

  return Promise.resolve({
    items: [
      {
        id: 7,
        code: 'WELCOME10',
        name: '신규가입 10%',
        type: 'percentage',
        value: 10,
        minOrderAmount: 30000,
        maxDiscount: 5000,
        totalQuantity: 100,
        issuedCount: 5,
        startsAt: '2026-07-25T00:00:00.000Z',
        expiresAt: '2026-08-25T00:00:00.000Z',
        isActive: true,
        createdAt: '2026-07-24T00:00:00.000Z',
      },
    ],
    total: 21,
    page: 1,
    limit: 20,
  });
});
    mockCreate.mockResolvedValue({ id: 8 });
    mockUpdate.mockResolvedValue({ id: 7 });
    mockRemove.mockResolvedValue({ message: 'deleted' });
    mockIssue.mockResolvedValue({ id: 1 });
  });

  it('paginates coupon management rows', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledWith({ page: 2, limit: 20 });
    });

    expect(await screen.findByText('WELCOME20')).toBeInTheDocument();
  });

  it('loads coupon rows and creates a coupon template', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('form.code'), { target: { value: 'SUMMER20' } });
    fireEvent.change(screen.getByLabelText('form.name'), { target: { value: '여름 20%' } });
    fireEvent.change(screen.getByLabelText('form.value'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('form.startsAt'), { target: { value: '2026-07-25T09:00' } });
    fireEvent.change(screen.getByLabelText('form.expiresAt'), { target: { value: '2026-08-25T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ code: 'SUMMER20', value: 20 }));
    });
  });

  it('issues a coupon to a member', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('issueForm.coupon'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('issueForm.userId'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'issue' }));

    await waitFor(() => {
      expect(mockIssue).toHaveBeenCalledWith({ couponId: 7, userId: 42 });
    });
  });
});

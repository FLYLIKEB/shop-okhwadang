import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminCouponRulesPage from '../page';

const mockUseAdminGuard = vi.fn();
const mockGetRules = vi.fn();
const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();
const mockRemoveRule = vi.fn();
const mockGetCouponsList = vi.fn();

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
  adminCouponRulesApi: {
    getList: (...args: unknown[]) => mockGetRules(...args),
    create: (...args: unknown[]) => mockCreateRule(...args),
    update: (...args: unknown[]) => mockUpdateRule(...args),
    remove: (...args: unknown[]) => mockRemoveRule(...args),
  },
  adminCouponsApi: {
    getList: (...args: unknown[]) => mockGetCouponsList(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('AdminCouponRulesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminGuard.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      isLoading: false,
      isAdmin: true,
    });
    mockGetRules.mockImplementation((params?: { page?: number; limit?: number }) => {
      const page = params?.page ?? 1;
      if (page === 2) {
        return Promise.resolve({
          items: [
            {
              id: 4,
              trigger: 'birthday',
              couponTemplateId: 21,
              couponTemplate: { id: 21, code: 'WELCOME20', name: '재방문 20%' },
              conditionsJson: null,
              active: true,
              createdAt: '2026-07-26T00:00:00.000Z',
              updatedAt: '2026-07-26T00:00:00.000Z',
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
            id: 3,
            trigger: 'signup',
            couponTemplateId: 7,
            couponTemplate: { id: 7, code: 'WELCOME10', name: '신규가입 10%' },
            conditionsJson: null,
            active: true,
            createdAt: '2026-07-25T00:00:00.000Z',
            updatedAt: '2026-07-25T00:00:00.000Z',
          },
        ],
        total: 21,
        page: 1,
        limit: 20,
      });
    });
    mockGetCouponsList.mockImplementation((params?: { page?: number; limit?: number; q?: string }) => {
      const keyword = params?.q ?? '';
      const items = [
        {
          id: 7,
          code: 'WELCOME10',
          name: '신규가입 10%',
          type: 'percentage',
          value: 10,
          minOrderAmount: 0,
          maxDiscount: 5000,
          totalQuantity: 100,
          issuedCount: 5,
          startsAt: '2026-07-25T00:00:00.000Z',
          expiresAt: '2026-08-25T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-07-24T00:00:00.000Z',
        },
        {
          id: 21,
          code: 'WELCOME20',
          name: '재방문 20%',
          type: 'percentage',
          value: 20,
          minOrderAmount: 0,
          maxDiscount: 8000,
          totalQuantity: 100,
          issuedCount: 0,
          startsAt: '2026-07-25T00:00:00.000Z',
          expiresAt: '2026-08-25T00:00:00.000Z',
          isActive: true,
          createdAt: '2026-07-24T00:00:00.000Z',
        },
      ].filter((coupon) => `${coupon.code} ${coupon.name}`.includes(keyword));
      return Promise.resolve({ items, total: items.length, page: 1, limit: 20 });
    });
    mockCreateRule.mockResolvedValue({ id: 4 });
    mockUpdateRule.mockResolvedValue({ id: 3 });
    mockRemoveRule.mockResolvedValue({ message: 'deleted' });
  });

  it('loads the current rules page and bounded coupon search results', async () => {
    render(<AdminCouponRulesPage />);

    await waitFor(() => {
      expect(mockGetRules).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(mockGetCouponsList).toHaveBeenCalledWith({ page: 1, limit: 20, q: undefined });
    });

    expect((await screen.findAllByText('WELCOME10 · 신규가입 10% (#7)')).length).toBeGreaterThan(0);
  });

  it('paginates coupon rule rows', async () => {
    render(<AdminCouponRulesPage />);

    expect((await screen.findAllByText('WELCOME10 · 신규가입 10% (#7)')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(mockGetRules).toHaveBeenCalledWith({ page: 2, limit: 20 });
    });

    expect((await screen.findAllByText('WELCOME20 · 재방문 20% (#21)')).length).toBeGreaterThan(0);
  });

  it('lets admins search coupon templates and create a new rule', async () => {
    render(<AdminCouponRulesPage />);

    expect((await screen.findAllByText('WELCOME10 · 신규가입 10% (#7)')).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('form.couponTemplateSearch'), { target: { value: 'WELCOME20' } });

    await waitFor(() => {
      expect(mockGetCouponsList).toHaveBeenCalledWith({ page: 1, limit: 20, q: 'WELCOME20' });
    });

    fireEvent.click(screen.getByRole('button', { name: /WELCOME20/ }));
    expect(screen.getByLabelText('form.couponTemplate')).toHaveValue(21);

    fireEvent.change(screen.getByLabelText('form.trigger'), { target: { value: 'tier_up' } });
    fireEvent.change(screen.getByLabelText('form.conditionsJson'), {
      target: { value: '{"minTier":"Silver"}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => {
      expect(mockCreateRule).toHaveBeenCalledWith({
        trigger: 'tier_up',
        couponTemplateId: 21,
        conditionsJson: { minTier: 'Silver' },
        active: true,
      });
    });
  });
});

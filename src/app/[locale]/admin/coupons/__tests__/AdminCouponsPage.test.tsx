import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminCouponsPage from '../page';

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  params: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigationMocks.push }),
  usePathname: () => '/ko/admin/coupons',
  useSearchParams: () => navigationMocks.params,
}));

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

function coupon(id: number, code: string, name: string) {
  return {
    id,
    code,
    name,
    type: 'percentage' as const,
    value: id === 21 ? 20 : 10,
    minOrderAmount: id === 21 ? 10000 : 30000,
    maxDiscount: id === 21 ? 8000 : 5000,
    totalQuantity: id === 21 ? 50 : 100,
    issuedCount: id === 21 ? 0 : 5,
    startsAt: id === 7 ? '2026-07-25T00:00:45.000Z' : '2026-07-25T00:00:00.000Z',
    expiresAt: id === 7 ? '2026-08-25T23:59:59.999Z' : '2026-08-25T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-07-24T00:00:00.000Z',
  };
}

function subminuteIssuedCoupon() {
  return {
    ...coupon(32, 'SUBMINUTE', '초 단위 쿠폰'),
    issuedCount: 1,
    startsAt: '2026-07-25T00:00:45.000Z',
    expiresAt: '2026-07-25T00:00:59.000Z',
  };
}

describe('AdminCouponsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigationMocks.params = new URLSearchParams();
    mockUseAdminGuard.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      isLoading: false,
      isAdmin: true,
    });
    mockGetList.mockImplementation((params?: { page?: number; limit?: number }) => {
      const page = params?.page ?? 1;

      if (page === 2) {
        return Promise.resolve({
          items: [coupon(21, 'WELCOME20', '재방문 20%')],
          total: 21,
          page: 2,
          limit: 20,
        });
      }

      return Promise.resolve({
        items: [coupon(7, 'WELCOME10', '신규가입 10%')],
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

  it('paginates coupon management rows through shared list state', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledWith({ page: 2, limit: 20, q: undefined, status: undefined });
    });

    expect(await screen.findByText('WELCOME20')).toBeInTheDocument();
  });

  it('loads coupon rows and creates a coupon template', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('form.code'), { target: { value: 'SUMMER20' } });
    fireEvent.change(screen.getByLabelText('form.name'), { target: { value: '여름 20%' } });
    fireEvent.change(screen.getByLabelText('form.valuePercentage'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('form.startsAt'), { target: { value: '2026-07-25T09:00' } });
    fireEvent.change(screen.getByLabelText('form.expiresAt'), { target: { value: '2026-08-25T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ code: 'SUMMER20', value: 20 }));
    });
  });

  it('updates issued coupons with changed editable fields only', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    fireEvent.change(screen.getByLabelText('form.name'), { target: { value: '신규가입 10% 수정' } });
    fireEvent.click(screen.getByRole('button', { name: 'update' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(7, { name: '신규가입 10% 수정' });
    });
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('startsAt');
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('expiresAt');
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('type');
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('value');
    expect(mockUpdate.mock.calls[0][1]).not.toHaveProperty('isActive');
  });

  it('keeps allowed issued metadata edits valid when unchanged datetimes share a displayed minute', async () => {
    mockGetList.mockResolvedValueOnce({
      items: [subminuteIssuedCoupon()],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<AdminCouponsPage />);

    expect(await screen.findByText('SUBMINUTE')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    fireEvent.change(screen.getByLabelText('form.name'), { target: { value: '초 단위 쿠폰 수정' } });
    fireEvent.click(screen.getByRole('button', { name: 'update' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(32, { name: '초 단위 쿠폰 수정' });
    });
    expect(screen.queryByText('validation.dateRange')).not.toBeInTheDocument();
  });

  it('sends explicit null when nullable coupon fields are cleared', async () => {
    mockGetList.mockResolvedValueOnce({
      items: [coupon(21, 'WELCOME20', '재방문 20%')],
      total: 1,
      page: 1,
      limit: 20,
    });
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME20')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    fireEvent.change(screen.getByLabelText('form.maxDiscount'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('form.totalQuantity'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'update' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(21, { maxDiscount: null, totalQuantity: null });
    });
  });

  it('blocks invalid coupon values before calling the API', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('form.code'), { target: { value: 'BAD150' } });
    fireEvent.change(screen.getByLabelText('form.name'), { target: { value: '잘못된 정률' } });
    fireEvent.change(screen.getByLabelText('form.valuePercentage'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('form.startsAt'), { target: { value: '2026-07-25T09:00' } });
    fireEvent.change(screen.getByLabelText('form.expiresAt'), { target: { value: '2026-08-25T09:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => {
      expect(screen.getByText('validation.percentMax')).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('shows percent or KRW units for the discount value label by type', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();
    expect(screen.getByLabelText('form.valuePercentage')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('form.type'), { target: { value: 'fixed' } });

    expect(screen.getByLabelText('form.valueFixed')).toBeInTheDocument();
    expect(screen.queryByLabelText('form.valuePercentage')).not.toBeInTheDocument();
  });

  it('issues a coupon to a member', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('issueForm.coupon'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('issueForm.userId'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'issue' }));

    await waitFor(() => {
      expect(mockIssue).toHaveBeenCalledWith({ couponId: 7, userId: 42 });
      expect(mockGetList).toHaveBeenCalledTimes(2);
    });
  });

  it('locks the open editor after the first successful issuance and refreshes the count', async () => {
    const unissued = coupon(21, 'WELCOME20', '재방문 20%');
    mockGetList.mockResolvedValueOnce({ items: [unissued], total: 1, page: 1, limit: 20 });
    mockGetList.mockResolvedValue({ items: [{ ...unissued, issuedCount: 1 }], total: 1, page: 1, limit: 20 });
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME20')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
    expect(screen.getByLabelText('form.valuePercentage')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('issueForm.coupon'), { target: { value: '21' } });
    fireEvent.change(screen.getByLabelText('issueForm.userId'), { target: { value: '42' } });
    fireEvent.click(screen.getByRole('button', { name: 'issue' }));

    await waitFor(() => {
      expect(screen.getByLabelText('form.valuePercentage')).toBeDisabled();
      expect(screen.getByText('1', { selector: 'td div' })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('form.name'), { target: { value: '새 이름' } });
    fireEvent.click(screen.getByRole('button', { name: 'update' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(21, { name: '새 이름' }));
  });

  it('keeps coupon filters and search in the URL-synced shared list contract', async () => {
    render(<AdminCouponsPage />);

    expect(await screen.findByText('WELCOME10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'filters.active' }));

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledWith({ page: 1, limit: 20, q: undefined, status: 'active' });
    });
    expect(navigationMocks.push).toHaveBeenCalledWith('/ko/admin/coupons?status=active', { scroll: false });

    fireEvent.change(screen.getByPlaceholderText('searchPlaceholder'), { target: { value: ' WELCOME20 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'search' }));

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledWith({ page: 1, limit: 20, q: 'WELCOME20', status: 'active' });
    });
  });

  it('shows the shared retry state when coupon loading fails', async () => {
    mockGetList.mockRejectedValueOnce(new Error('network'));

    render(<AdminCouponsPage />);

    expect(await screen.findByText('loadError')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledTimes(2);
    });
  });
});

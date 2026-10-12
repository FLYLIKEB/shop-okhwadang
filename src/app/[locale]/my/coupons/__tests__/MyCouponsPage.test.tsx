import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyCouponsPage from '../page';

const mockGetList = vi.fn();

const translate = (key: string, values?: Record<string, string | number>) => {
  if (key === 'emptyByTab' && values) return `empty:${values.status}`;
  if (key === 'availabilityReason.not_started' && values) return `starts:${values.date}`;
  return key;
};

vi.mock('next-intl', () => ({
  useTranslations: () => translate,
  useLocale: () => 'ko',
}));

vi.mock('@/components/shared/hooks/useRequireAuth', () => ({
  useRequireAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

vi.mock('@/lib/api', () => ({
  couponsApi: {
    getList: (...args: unknown[]) => mockGetList(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const availableCoupon = {
  id: 1,
  couponId: 10,
  code: 'WELCOME',
  name: '신규가입 할인',
  type: 'percentage' as const,
  value: 10,
  minOrderAmount: 30000,
  maxDiscount: 0,
  startsAt: '2030-01-01T00:00:00.000Z',
  expiresAt: '2030-12-31T23:59:59.000Z',
  status: 'available' as const,
  availabilityReason: 'not_started' as const,
  issuedAt: '2026-01-01T00:00:00.000Z',
  usedAt: null,
};

const inactiveCoupon = {
  ...availableCoupon,
  id: 2,
  code: 'PAUSED',
  name: '비활성 쿠폰',
  availabilityReason: 'inactive' as const,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe('MyCouponsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetList.mockResolvedValue({
      coupons: [availableCoupon],
      points: { balance: 1200, willExpireSoon: 0 },
    });
  });

  it('shows availability reasons without marking future coupons expired', async () => {
    render(<MyCouponsPage />);

    expect(await screen.findByText('신규가입 할인')).toBeInTheDocument();
    expect(screen.getAllByText('tab.available').length).toBeGreaterThan(0);
    expect(screen.getByText(/starts:/)).toBeInTheDocument();
  });

  it('loads all coupons without status and shows pending or inactive badges there', async () => {
    render(<MyCouponsPage />);

    expect(await screen.findByText('신규가입 할인')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'tab.all' }));

    await waitFor(() => {
      expect(mockGetList).toHaveBeenLastCalledWith(undefined);
    });
    expect(screen.getByText('availabilityBadge.not_started')).toBeInTheDocument();
  });

  it('clears stale coupons and shows retry feedback after a later load fails', async () => {
    mockGetList
      .mockResolvedValueOnce({ coupons: [availableCoupon], points: { balance: 1200, willExpireSoon: 0 } })
      .mockRejectedValueOnce(new Error('network'));

    render(<MyCouponsPage />);

    expect(await screen.findByText('신규가입 할인')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'tab.used' }));

    await waitFor(() => {
      expect(screen.getByText('loadError')).toBeInTheDocument();
    });
    expect(screen.queryByText('신규가입 할인')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'retry' })).toBeInTheDocument();
  });

  it('ignores stale late results and stale late errors after rapid tab changes', async () => {
    const first = deferred<{ coupons: Array<typeof availableCoupon>; points: { balance: number; willExpireSoon: number } }>();
    const second = deferred<{ coupons: Array<typeof inactiveCoupon>; points: { balance: number; willExpireSoon: number } }>();
    mockGetList
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    render(<MyCouponsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'tab.all' }));

    await act(async () => {
      second.resolve({ coupons: [inactiveCoupon], points: { balance: 300, willExpireSoon: 0 } });
    });
    expect(await screen.findByText('비활성 쿠폰')).toBeInTheDocument();

    await act(async () => {
      first.reject(new Error('late network'));
    });
    await waitFor(() => {
      expect(screen.queryByText('loadError')).not.toBeInTheDocument();
      expect(screen.getByText('비활성 쿠폰')).toBeInTheDocument();
    });
  });
});

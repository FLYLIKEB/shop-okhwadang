import { render, waitFor, act, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '../page';

const mockLocale = vi.hoisted(() => vi.fn(() => 'ko'));

vi.mock('next-intl', () => ({
  useLocale: mockLocale,
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/dynamic', () => ({ default: () => () => null }));

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/admin/dashboard',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockGet = vi.fn();

vi.mock('@/lib/api', () => ({
  adminDashboardApi: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

const mockUseAdminGuard = vi.fn();

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({
  useAdminGuard: () => mockUseAdminGuard(),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale.mockReturnValue('ko');
    mockGet.mockResolvedValue({
      kpi: {
        today_revenue: 100000,
        today_revenue_diff_pct: 10,
        today_orders: 50,
        today_orders_diff_pct: 5,
        new_members_today: 10,
        new_members_diff_pct: 0,
        total_product_views: 1000,
      },
      revenue_chart: [],
      order_status_summary: {},
      recent_orders: [],
    });
  });

  describe('useAdminGuard 통합', () => {
    it('관리자가 아닌 경우 dashboard 데이터를 가져오지 않아야 한다', async () => {
      mockUseAdminGuard.mockReturnValue({
        user: { id: 1, email: 'user@test.com', name: 'User', role: 'user' },
        isLoading: false,
        isAdmin: false,
      });

      render(<DashboardPage />);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockGet).not.toHaveBeenCalled();
    });

    it('관리자인 경우 dashboard 데이터를 가져와야 한다', async () => {
      mockUseAdminGuard.mockReturnValue({
        user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
        isLoading: false,
        isAdmin: true,
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalled();
      });
    });
  });
  describe('period selection', () => {
    beforeEach(() => mockUseAdminGuard.mockReturnValue({ isAdmin: true }));

    it('requests the selected period and labels KPI/comparisons by that period', async () => {
      render(<DashboardPage />);
      await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith({ period: '30d' }));
      for (const period of ['today', '7d', '90d', '30d']) {
        fireEvent.click(screen.getByRole('button', { name: `period.${period}` }));
        await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith({ period }));
      }
      expect(await screen.findByText('periodRevenue')).toBeInTheDocument();
      expect(screen.getAllByText('comparePreviousPeriod').length).toBeGreaterThan(0);
      expect(screen.getByText('cumulativeProductViews')).toBeInTheDocument();
    });

    it('keeps admin revenue in KRW on the English page, matching the charts', async () => {
      mockLocale.mockReturnValue('en');
      render(<DashboardPage />);
      expect(await screen.findByText('₩100,000')).toBeInTheDocument();
      expect(screen.queryByText('$74.07')).not.toBeInTheDocument();
    });

    it('does not fetch an incomplete custom range or keep showing old data', async () => {
      render(<DashboardPage />);
      await screen.findByText('₩100,000');
      fireEvent.click(screen.getByRole('button', { name: 'period.custom' }));
      expect(screen.queryByText('₩100,000')).not.toBeInTheDocument();
      expect(screen.getByText('selectDates')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('startDate'), { target: { value: '2026-10-01' } });
      expect(mockGet).toHaveBeenCalledTimes(1);
      fireEvent.change(screen.getByLabelText('endDate'), { target: { value: '2026-10-07' } });
      await waitFor(() => expect(mockGet).toHaveBeenLastCalledWith({ startDate: '2026-10-01', endDate: '2026-10-07' }));
    });

    it.each(['success', 'failure'])('ignores an older %s while the latest period is still loading', async (outcome) => {
      render(<DashboardPage />);
      await screen.findByText('₩100,000');
      let resolveOld!: (value: unknown) => void;
      let rejectOld!: (reason: Error) => void;
      let resolveLatest!: (value: unknown) => void;
      mockGet.mockImplementationOnce(() => new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; }));
      mockGet.mockImplementationOnce(() => new Promise(resolve => { resolveLatest = resolve; }));
      fireEvent.click(screen.getByRole('button', { name: 'period.7d' }));
      fireEvent.click(screen.getByRole('button', { name: 'period.90d' }));
      const response = { kpi: { today_revenue: 900000, today_orders: 9, new_members_today: 1, total_product_views: 0 }, revenue_chart: [], order_status_summary: {}, recent_orders: [] };
      await act(async () => {
        if (outcome === 'failure') rejectOld(new Error('old request'));
        else resolveOld({ ...response, kpi: { ...response.kpi, today_revenue: 700000 } });
      });
      expect(screen.getByText('loading')).toBeInTheDocument();
      expect(screen.queryByText('₩100,000')).not.toBeInTheDocument();
      expect(screen.queryByText('₩700,000')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      await act(async () => resolveLatest(response));
      expect(await screen.findByText('₩900,000')).toBeInTheDocument();
    });
  });

});

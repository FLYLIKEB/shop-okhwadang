import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '../page';

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
});

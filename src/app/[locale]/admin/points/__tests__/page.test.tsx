import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPointsPage from '../page';

const mockPush = vi.fn();
const mockUseAdminGuard = vi.fn();
const mockMembersGetList = vi.fn();
const mockGetUserSummary = vi.fn();
const mockGetUserHistory = vi.fn();
const mockCreateAdjustment = vi.fn();
const translate = (key: string, values?: Record<string, string | number>) => {
  if (key === 'selectedUserFallback' && values) return `selectedUserFallback:${values.userId}`;
  return key;
};

let currentSearchParams = new URLSearchParams('');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => '/admin/points',
  useSearchParams: () => currentSearchParams,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => translate,
  useLocale: () => 'ko',
}));

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({
  useAdminGuard: () => mockUseAdminGuard(),
}));

vi.mock('@/lib/api', () => ({
  adminMembersApi: {
    getList: (...args: unknown[]) => mockMembersGetList(...args),
  },
  adminPointsApi: {
    getUserSummary: (...args: unknown[]) => mockGetUserSummary(...args),
    getUserHistory: (...args: unknown[]) => mockGetUserHistory(...args),
    createAdjustment: (...args: unknown[]) => mockCreateAdjustment(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('AdminPointsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams('userId=42');
    mockUseAdminGuard.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      isLoading: false,
      isAdmin: true,
    });
    mockMembersGetList.mockImplementation((params?: { page?: number; limit?: number }) => {
      const page = params?.page ?? 1;

      if (page === 2) {
        return Promise.resolve({
          items: [],
          total: 1,
          page: 2,
          limit: 100,
        });
      }

      return Promise.resolve({
        items: [
          {
            id: 42,
            email: 'member@example.com',
            name: '회원',
            phone: null,
            role: 'user',
            isActive: true,
            createdAt: '2026-07-25T00:00:00.000Z',
            updatedAt: '2026-07-25T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
      });
    });
mockGetUserSummary.mockResolvedValue({ userId: 42, balance: 9000 });
mockGetUserHistory.mockImplementation((_: number, params?: { page?: number; limit?: number }) => {
  if (params?.page === 2) {
    return Promise.resolve({
      items: [
        {
          id: 2,
          userId: 42,
          type: 'spend',
          amount: -500,
          balance: 8500,
          description: '주문 사용',
          createdAt: '2026-07-26T00:00:00.000Z',
          sourceKind: 'order_use',
        },
      ],
      total: 55,
      page: 2,
      limit: 50,
    });
  }

  return Promise.resolve({
    items: [
      {
        id: 1,
        userId: 42,
        type: 'earn',
        amount: 3000,
        balance: 9000,
        description: '리뷰 적립',
        createdAt: '2026-07-25T00:00:00.000Z',
        sourceKind: 'review_reward_earn',
      },
    ],
    total: 55,
    page: 1,
    limit: 50,
  });
});
mockCreateAdjustment.mockResolvedValue({ pointHistoryId: 2, auditLogId: 3, userId: 42, delta: -2000, balanceAfter: 7000, description: '관리자 수동 포인트 조정: 수동 차감', createdAt: '2026-07-25T00:00:00.000Z' });
  });

it('loads member-linked point history with sourceKind badges', async () => {
  render(<AdminPointsPage />);

  await waitFor(() => {
    expect(mockGetUserSummary).toHaveBeenCalledWith(42);
    expect(mockGetUserHistory).toHaveBeenCalledWith(42, { page: 1, limit: 50 });
  });

expect(await screen.findByText('sourceKinds.review_reward_earn')).toBeInTheDocument();
expect(screen.getByText('리뷰 적립')).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'next' })).toBeEnabled();
});

it('loads every member page so deep-linked users outside page 1 remain selectable', async () => {
  currentSearchParams = new URLSearchParams('userId=84');
  mockMembersGetList.mockImplementation((params?: { page?: number; limit?: number }) => {
    const page = params?.page ?? 1;

    if (page === 2) {
      return Promise.resolve({
        items: [
          {
            id: 84,
            email: 'second@example.com',
            name: '두번째 회원',
            phone: null,
            role: 'user',
            isActive: true,
            createdAt: '2026-07-25T00:00:00.000Z',
            updatedAt: '2026-07-25T00:00:00.000Z',
          },
        ],
        total: 2,
        page: 2,
        limit: 100,
      });
    }

    return Promise.resolve({
      items: [
        {
          id: 42,
          email: 'member@example.com',
          name: '회원',
          phone: null,
          role: 'user',
          isActive: true,
          createdAt: '2026-07-25T00:00:00.000Z',
          updatedAt: '2026-07-25T00:00:00.000Z',
        },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
  });

  render(<AdminPointsPage />);

  await waitFor(() => {
    expect(mockMembersGetList).toHaveBeenCalledWith({ q: undefined, page: 1, limit: 100 });
    expect(mockMembersGetList).toHaveBeenCalledWith({ q: undefined, page: 2, limit: 100 });
  });

  expect(await screen.findByText('두번째 회원')).toBeInTheDocument();
  expect(screen.getByText('second@example.com')).toBeInTheDocument();
});

it('navigates point history pages for the selected member', async () => {
  render(<AdminPointsPage />);

expect(await screen.findByText('sourceKinds.review_reward_earn')).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: 'next' }));

await waitFor(() => {
  expect(mockGetUserHistory).toHaveBeenCalledWith(42, { page: 2, limit: 50 });
  });

  expect(await screen.findByText('sourceKinds.order_use')).toBeInTheDocument();
});

  it('keeps the ?userId deep link pattern and posts adjustments for the selected member', async () => {
    render(<AdminPointsPage />);

    expect(await screen.findByText('회원')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /회원/ }));
    expect(mockPush).toHaveBeenCalledWith('/admin/points?userId=42', { scroll: false });

    fireEvent.change(screen.getByLabelText('adjustmentAmount'), { target: { value: '-2000' } });
    fireEvent.change(screen.getByLabelText('adjustmentReason'), { target: { value: '수동 차감' } });
    fireEvent.click(screen.getByRole('button', { name: 'adjust' }));

    await waitFor(() => {
      expect(mockCreateAdjustment).toHaveBeenCalledWith({
        userId: 42,
        delta: -2000,
        reason: '수동 차감',
      });
    });
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminInquiriesPage from '../page';
import type { Inquiry } from '@/lib/api';

const mockUseAdminGuard = vi.fn();
const mockGetAll = vi.fn();
const mockAnswer = vi.fn();

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({
  useAdminGuard: () => mockUseAdminGuard(),
}));

vi.mock('@/lib/api', () => ({
  adminInquiriesApi: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
    answer: (...args: unknown[]) => mockAnswer(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const makeInquiry = (overrides: Partial<Inquiry>): Inquiry => ({
  id: 1,
  type: '배송',
  title: '문의',
  content: '문의 내용',
  isSecret: false,
  status: 'pending',
  answer: null,
  answeredAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  user: {
    id: 1,
    email: 'customer@example.com',
    name: '고객',
  },
  ...overrides,
});

describe('AdminInquiriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminGuard.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' },
      isLoading: false,
      isAdmin: true,
    });
  });

  it('uses server metadata for pending count instead of the current page subset', async () => {
    mockGetAll.mockResolvedValue({
      items: [
        makeInquiry({
          id: 10,
          status: 'answered',
          title: '답변된 문의',
          answer: '답변',
          answeredAt: '2026-01-02T00:00:00.000Z',
        }),
      ],
      total: 80,
      page: 1,
      limit: 20,
      counts: {
        pending: 72,
        answered: 8,
      },
    });

    render(<AdminInquiriesPage />);

    expect(await screen.findByText('답변된 문의')).toBeInTheDocument();
    expect(screen.getByText('미답변 72건')).toBeInTheDocument();
    expect(mockGetAll).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: undefined,
    });
  });

  it('requests server-side status-filtered pages instead of filtering the first page locally', async () => {
    mockGetAll
      .mockResolvedValueOnce({
        items: [
          makeInquiry({
            id: 10,
            status: 'answered',
            title: '첫 페이지 답변 문의',
            answer: '답변',
            answeredAt: '2026-01-02T00:00:00.000Z',
          }),
        ],
        total: 80,
        page: 1,
        limit: 20,
        counts: {
          pending: 72,
          answered: 8,
        },
      })
      .mockResolvedValueOnce({
        items: [
          makeInquiry({
            id: 51,
            status: 'pending',
            title: '서버에서 가져온 미답변 문의',
          }),
        ],
        total: 72,
        page: 1,
        limit: 20,
        counts: {
          pending: 72,
          answered: 8,
        },
      });

    render(<AdminInquiriesPage />);

    expect(await screen.findByText('첫 페이지 답변 문의')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '미답변' }));

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        status: 'pending',
      });
    });
    expect(await screen.findByText('서버에서 가져온 미답변 문의')).toBeInTheDocument();
    expect(screen.queryByText('첫 페이지 답변 문의')).not.toBeInTheDocument();
  });
});

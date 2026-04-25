import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReviewsTab from '@/components/shared/reviews/ReviewsTab';
import type { ReviewListResponse } from '@/lib/api';

// ReviewsTab 은 ReviewList 의 thin wrapper.
// ReviewList 가 노출하는 페이징/정렬 동작을 ReviewsTab 통합 시나리오로 검증.
const { getByProductMock } = vi.hoisted(() => ({
  getByProductMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  reviewsApi: {
    getByProduct: getByProductMock,
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/shared/reviews/ReviewCard', () => ({
  default: ({ review }: { review: { id: number; content: string | null } }) => (
    <div data-testid={`review-card-${review.id}`}>{review.content ?? '(no content)'}</div>
  ),
}));

vi.mock('@/components/shared/reviews/ReviewStats', () => ({
  default: ({ stats }: { stats: { totalCount: number } }) => (
    <div data-testid="review-stats">총 {stats.totalCount}개</div>
  ),
}));

function makeResponse(overrides: Partial<ReviewListResponse> = {}): ReviewListResponse {
  return {
    data: [
      {
        id: 1,
        userId: 10,
        userName: 'Alice',
        productId: 1,
        orderItemId: 1,
        rating: 5,
        content: '좋아요',
        imageUrls: null,
        isVisible: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
    stats: { averageRating: 5, totalCount: 1, distribution: { '5': 1, '4': 0, '3': 0, '2': 0, '1': 0 } },
    pagination: { page: 1, limit: 20, total: 1 },
    ...overrides,
  };
}

describe('ReviewsTab', () => {
  beforeEach(() => {
    getByProductMock.mockReset();
  });

  it('마운트 시 productId 로 reviewsApi.getByProduct 호출 (sort=recent, page=1)', async () => {
    getByProductMock.mockResolvedValue(makeResponse());
    render(<ReviewsTab productId={42} />);
    await waitFor(() => {
      expect(getByProductMock).toHaveBeenCalledWith(42, expect.objectContaining({
        sort: 'recent',
        page: 1,
        limit: 20,
      }));
    });
  });

  it('리뷰 데이터 렌더링', async () => {
    getByProductMock.mockResolvedValue(makeResponse());
    render(<ReviewsTab productId={1} />);
    expect(await screen.findByTestId('review-card-1')).toHaveTextContent('좋아요');
  });

  it('빈 결과 → "아직 리뷰가 없습니다." 메시지', async () => {
    getByProductMock.mockResolvedValue(
      makeResponse({ data: [], stats: { averageRating: 0, totalCount: 0, distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 } } }),
    );
    render(<ReviewsTab productId={1} />);
    expect(await screen.findByText('아직 리뷰가 없습니다.')).toBeInTheDocument();
  });

  it('정렬 변경 → sort 파라미터 갱신 + page=1 리셋', async () => {
    getByProductMock.mockResolvedValue(makeResponse());
    render(<ReviewsTab productId={1} />);
    await waitFor(() => expect(getByProductMock).toHaveBeenCalled());

    getByProductMock.mockClear();
    await userEvent.click(screen.getByRole('button', { name: '별점 높은순' }));

    await waitFor(() => {
      expect(getByProductMock).toHaveBeenCalledWith(1, expect.objectContaining({
        sort: 'rating_high',
        page: 1,
      }));
    });
  });

  it('total > limit → 페이지네이션 버튼 렌더', async () => {
    getByProductMock.mockResolvedValue(
      makeResponse({ pagination: { page: 1, limit: 20, total: 50 } }),
    );
    render(<ReviewsTab productId={1} />);
    expect(await screen.findByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
  });

  it('"다음" 버튼 → page=2 로 fetch', async () => {
    getByProductMock.mockResolvedValue(
      makeResponse({ pagination: { page: 1, limit: 20, total: 50 } }),
    );
    render(<ReviewsTab productId={1} />);
    await screen.findByText('1 / 3');

    getByProductMock.mockClear();
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => {
      expect(getByProductMock).toHaveBeenCalledWith(1, expect.objectContaining({ page: 2 }));
    });
  });

  it('마지막 페이지에서 "다음" 버튼 disabled', async () => {
    getByProductMock.mockResolvedValue(
      makeResponse({ pagination: { page: 3, limit: 20, total: 50 } }),
    );
    render(<ReviewsTab productId={1} />);
    await screen.findByText('1 / 3');
    // 첫 fetch 결과는 page=1, total=50 으로 클라이언트 page 가 1 이므로
    // "다음" 두 번 눌러서 마지막 페이지로
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByText('2 / 3');
    await userEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByText('3 / 3');
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });
});

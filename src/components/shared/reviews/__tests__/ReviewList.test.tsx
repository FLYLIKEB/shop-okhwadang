import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ReviewList from '../ReviewList'

const mockGetByProduct = vi.fn()

vi.mock('@/lib/api', () => ({
  reviewsApi: {
    getByProduct: (...args: unknown[]) => mockGetByProduct(...args),
  },
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, number>) => {
    if (key === 'totalCount') {
      return `총 ${params?.count ?? 0}개`
    }
    if (key === 'nStar') {
      return `${params?.n ?? 0}점`
    }
    return key
  },
}))

describe('ReviewList', () => {
  const mockResponse = {
    data: [
      {
        id: 1,
        source: 'internal' as const,
        userId: 10,
        userName: '홍**',
        productId: 5,
        orderItemId: 22,
        rating: 5,
        content: '정말 좋아요',
        imageUrls: null,
        isVisible: true,
        createdAt: '2026-03-01T12:00:00Z',
      },
    ],
    stats: {
      averageRating: 5,
      totalCount: 1,
      distribution: { '5': 1, '4': 0, '3': 0, '2': 0, '1': 0 },
    },
    pagination: { page: 1, limit: 20, total: 1 },
  }

  beforeEach(() => {
    mockGetByProduct.mockResolvedValue(mockResponse)
  })

  it('renders reviews after loading', async () => {
    render(<ReviewList productId={5} />)

    await waitFor(() => {
      expect(screen.getByText('정말 좋아요')).toBeInTheDocument()
    })
    expect(screen.getByText('홍**')).toBeInTheDocument()
  })


  it('renders SmartStore source badge for external reviews', async () => {
    mockGetByProduct.mockResolvedValue({
      ...mockResponse,
      data: [
        {
          ...mockResponse.data[0],
          id: 9,
          source: 'smartstore' as const,
          externalReviewId: 'naver-1',
          userName: '네**',
          orderItemId: null,
          content: '스마트스토어 후기',
        },
      ],
      stats: { ...mockResponse.stats, totalCount: 2, externalCount: 1 },
    })

    render(<ReviewList productId={5} />)

    await waitFor(() => {
      expect(screen.getByText('스마트스토어 후기')).toBeInTheDocument()
    })
    expect(screen.getByText('네이버 스마트스토어')).toBeInTheDocument()
    expect(screen.getByText('네이버 스마트스토어 1개 포함')).toBeInTheDocument()
  })

  it('shows empty state when no reviews', async () => {
    mockGetByProduct.mockResolvedValue({
      data: [],
      stats: { averageRating: 0, totalCount: 0, distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 } },
      pagination: { page: 1, limit: 20, total: 0 },
    })

    render(<ReviewList productId={5} />)

    await waitFor(() => {
      expect(screen.getByText('아직 리뷰가 없습니다.')).toBeInTheDocument()
    })
  })

  it('renders sort buttons', async () => {
    render(<ReviewList productId={5} />)

    await waitFor(() => {
      expect(screen.getByText('최신순')).toBeInTheDocument()
    })
    expect(screen.getByText('별점 높은순')).toBeInTheDocument()
    expect(screen.getByText('별점 낮은순')).toBeInTheDocument()
  })

  it('changes sort on button click', async () => {
    render(<ReviewList productId={5} />)

    await waitFor(() => {
      expect(screen.getByText('별점 높은순')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('별점 높은순'))

    await waitFor(() => {
      expect(mockGetByProduct).toHaveBeenCalledWith(5, expect.objectContaining({ sort: 'rating_high' }))
    })
  })
})

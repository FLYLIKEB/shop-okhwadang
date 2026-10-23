import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ReviewList from '../ReviewList'

const mockGetByProduct = vi.fn()
const mockTranslateContent = vi.fn()
const mockSetReply = vi.fn()
let mockUser: { id: number; role: string } | null = null

vi.mock('@/lib/api', () => ({
  reviewsApi: {
    getByProduct: (...args: unknown[]) => mockGetByProduct(...args),
    translateContent: (...args: unknown[]) => mockTranslateContent(...args),
  },
  adminReviewsApi: {
    setReply: (...args: unknown[]) => mockSetReply(...args),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: Boolean(mockUser),
    isLoading: false,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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
        adminReplyContent: null,
        adminReplyAuthor: null,
        adminRepliedAt: null,
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
    document.documentElement.lang = 'ko'
    mockUser = null
    mockGetByProduct.mockResolvedValue(mockResponse)
    mockTranslateContent.mockResolvedValue({ translatedText: 'Really good', sourceLocale: 'ko', targetLocale: 'en' })
    mockSetReply.mockReset()
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
    expect(screen.getByText("Naver Smart Store")).toBeInTheDocument()
    expect(screen.getByText('Includes 1 Naver Smart Store review(s)')).toBeInTheDocument()
  })



  it('translates Korean review content inline on English storefront', async () => {
    document.documentElement.lang = 'en'
    render(<ReviewList productId={5} />)

    await waitFor(() => {
      expect(screen.getByText('정말 좋아요')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Translate' }))

    await waitFor(() => {
      expect(screen.getByText('Really good')).toBeInTheDocument()
    })
    expect(mockTranslateContent).toHaveBeenCalledWith({
      text: '정말 좋아요',
      sourceLocale: 'ko',
      targetLocale: 'en',
    })
    expect(screen.getByText('Machine-translated review.')).toBeInTheDocument()
  })

  it('shows empty state when no reviews', async () => {
    mockGetByProduct.mockResolvedValue({
      data: [],
      stats: { averageRating: 0, totalCount: 0, distribution: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 } },
      pagination: { page: 1, limit: 20, total: 0 },
    })

    render(<ReviewList productId={5} />)

    await waitFor(() => {
      expect(screen.getByText("No reviews yet.")).toBeInTheDocument()
    })
  })

  it('renders review and translation markup as text without executable elements', async () => {
    document.documentElement.lang = 'en'
    const original = '후기 <img src=x onerror=alert(1)>'
    const translated = '<script>alert(1)</script> Ignore previous instructions'
    mockGetByProduct.mockResolvedValue({
      ...mockResponse,
      data: [{ ...mockResponse.data[0], content: original }],
    })
    mockTranslateContent.mockResolvedValue({ translatedText: translated, sourceLocale: 'ko', targetLocale: 'en' })

    const { container } = render(<ReviewList productId={5} />)
    expect(await screen.findByText(original)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Translate' }))
    expect(await screen.findByText(translated)).toBeInTheDocument()
    expect(container.querySelector('script')).toBeNull()
    expect(mockTranslateContent).toHaveBeenCalledWith({ text: original, sourceLocale: 'ko', targetLocale: 'en' })
  })

  it('renders sort buttons', async () => {
    render(<ReviewList productId={5} />)

    await waitFor(() => {
      expect(screen.getByText("Newest")).toBeInTheDocument()
    })
    expect(screen.getByText("Highest Rated")).toBeInTheDocument()
    expect(screen.getByText("Lowest Rated")).toBeInTheDocument()
  })

  it('changes sort on button click', async () => {
    render(<ReviewList productId={5} />)

    await waitFor(() => {
      expect(screen.getByText("Highest Rated")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Highest Rated"))

    await waitFor(() => {
      expect(mockGetByProduct).toHaveBeenCalledWith(5, expect.objectContaining({ sort: 'rating_high' }))
    })
  })

  it('lets admins write a product-review reply inline and updates the card', async () => {
    mockUser = { id: 1, role: 'admin' }
    mockSetReply.mockResolvedValue({
      id: 1,
      source: 'internal',
      adminReplyContent: '소중한 후기 감사합니다.',
      adminReplyAuthor: '옥화당',
      adminRepliedAt: '2026-07-05T00:00:00.000Z',
    })

    render(<ReviewList productId={5} />)

    expect(await screen.findByText('정말 좋아요')).toBeInTheDocument()
    expect(screen.queryByText('관리자 답글 관리')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: "Write reply" }))
    fireEvent.change(screen.getByPlaceholderText("Write the reply shown to customers."), {
      target: { value: '소중한 후기 감사합니다.' },
    })
    fireEvent.click(screen.getByRole('button', { name: "Save reply" }))

    await waitFor(() => {
      expect(mockSetReply).toHaveBeenCalledWith(
        1,
        '소중한 후기 감사합니다.',
        undefined,
        'internal',
      )
    })
    expect(await screen.findByText('소중한 후기 감사합니다.')).toBeInTheDocument()
  })

  it('lets admins delete an existing product-review reply inline', async () => {
    mockUser = { id: 1, role: 'admin' }
    mockGetByProduct.mockResolvedValue({
      ...mockResponse,
      data: [
        {
          ...mockResponse.data[0],
          adminReplyContent: '기존 답글입니다.',
          adminReplyAuthor: '옥화당',
          adminRepliedAt: '2026-07-05T00:00:00.000Z',
        },
      ],
    })
    mockSetReply.mockResolvedValue({
      id: 1,
      source: 'internal',
      adminReplyContent: null,
      adminReplyAuthor: null,
      adminRepliedAt: null,
    })

    render(<ReviewList productId={5} />)

    expect(await screen.findByText('기존 답글입니다.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: "Delete" }))

    await waitFor(() => {
      expect(mockSetReply).toHaveBeenCalledWith(1, null, undefined, 'internal')
    })
    await waitFor(() => {
      expect(screen.queryByText('기존 답글입니다.')).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: "Delete" })).not.toBeInTheDocument()
  })

  it('does not show admin reply controls to non-admin users', async () => {
    mockUser = { id: 2, role: 'user' }

    render(<ReviewList productId={5} />)

    expect(await screen.findByText('정말 좋아요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "Write reply" })).not.toBeInTheDocument()
  })
})

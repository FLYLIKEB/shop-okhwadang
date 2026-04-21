import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProductTabs from '@/components/shared/products/ProductTabs'

vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}))

const mockUseAuth = vi.fn(() => ({
  isAuthenticated: false,
}))

const mockGetList = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@/lib/api', () => ({
  inquiriesApi: {
    getList: (...args: unknown[]) => mockGetList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/ko/products/1',
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const translations: Record<string, string> = {
  'tabs.details': '상세정보',
  'tabs.reviews': '리뷰',
  'tabs.inquiry': '문의',
  'tabs.comingSoon': '준비 중입니다.',
  'tabs.inquiryPanel.loginRequiredTitle': '로그인이 필요합니다.',
  'tabs.inquiryPanel.loginRequiredDescription': '문의를 작성하려면 로그인해주세요.',
  'tabs.inquiryPanel.loginAction': '로그인하기',
  'tabs.inquiryPanel.listTitle': '내 문의 내역',
  'tabs.inquiryPanel.loading': '문의 내역을 불러오는 중입니다.',
  'tabs.inquiryPanel.empty': '등록된 문의가 없습니다.',
  'tabs.inquiryPanel.titleLabel': '제목',
  'tabs.inquiryPanel.titlePlaceholder': '문의 제목을 입력해주세요',
  'tabs.inquiryPanel.contentLabel': '내용',
  'tabs.inquiryPanel.contentPlaceholder': '문의 내용을 입력해주세요',
  'tabs.inquiryPanel.submit': '문의 등록',
  'tabs.inquiryPanel.submitting': '등록 중...',
  'tabs.inquiryPanel.statusPending': '접수',
  'tabs.inquiryPanel.statusAnswered': '답변완료',
  'tabs.inquiryPanel.answerLabel': '답변',
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const template = translations[key] ?? key
    if (!values) return template
    return Object.entries(values).reduce(
      (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
      template,
    )
  },
}))

describe('ProductTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ isAuthenticated: false })
    mockGetList.mockResolvedValue({ data: [] })
    mockCreate.mockResolvedValue({ id: 1 })
  })

  it('default tab shows description content', () => {
    render(<ProductTabs description="<p>상품 상세 내용입니다.</p>" descriptionImages={[]} />)
    expect(screen.getByText('상세정보')).toBeInTheDocument()
    const detailContent = document.querySelector('.prose')
    expect(detailContent).toBeInTheDocument()
  })

  it('clicking 리뷰 tab shows 준비 중입니다', async () => {
    const user = userEvent.setup()
    render(<ProductTabs description={null} descriptionImages={[]} />)
    await user.click(screen.getByRole('button', { name: '리뷰' }))
    expect(screen.getByText('준비 중입니다.')).toBeInTheDocument()
  })

  it('clicking 문의 tab shows login call-to-action when user is not authenticated', async () => {
    const user = userEvent.setup()
    render(<ProductTabs description={null} descriptionImages={[]} />)
    await user.click(screen.getByRole('button', { name: '문의' }))
    expect(screen.getByText('로그인이 필요합니다.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인하기' })).toHaveAttribute(
      'href',
      '/login?redirect=%2Fko%2Fproducts%2F1',
    )
  })

  it('loads inquiries and submits new inquiry when user is authenticated', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({ isAuthenticated: true })
    mockGetList.mockResolvedValue({
      data: [
        {
          id: 22,
          type: '상품',
          title: '기존 문의',
          content: '내용',
          status: 'pending',
          answer: null,
          answeredAt: null,
          createdAt: '2026-04-21T10:00:00.000Z',
        },
      ],
    })

    render(<ProductTabs description={null} descriptionImages={[]} productId={1} />)
    await user.click(screen.getByRole('button', { name: '문의' }))

    expect(await screen.findByText('내 문의 내역')).toBeInTheDocument()
    expect(await screen.findByText('기존 문의')).toBeInTheDocument()
    expect(mockGetList).toHaveBeenCalled()

    await user.type(screen.getByLabelText('제목'), '추가 문의')
    await user.type(screen.getByLabelText('내용'), '문의 내용')
    await user.click(screen.getByRole('button', { name: '문의 등록' }))

    expect(mockCreate).toHaveBeenCalledWith({
      type: '상품',
      title: '추가 문의',
      content: '문의 내용',
    })
  })
})

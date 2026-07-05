import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ImageGallery from '@/components/shared/products/ImageGallery'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/products/1',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/hooks/useUrlModal', async () => {
  const React = await import('react')
  return {
    useUrlModal: () => {
      const [isOpen, setIsOpenState] = React.useState(false)
      const setOpen = (open: boolean) => setIsOpenState(open)
      const close = () => setIsOpenState(false)
      return [isOpen, setOpen, close] as const
    },
    useUrlQueryState: () => {
      const [value, setValueState] = React.useState<string | null>(null)
      const setValue = (nextValue: string | null) => setValueState(nextValue)
      const close = () => setValueState(null)
      return { value, setValue, close }
    },
  }
})

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

const mockImages = [
  { id: 1, url: '/img/1.jpg', alt: '첫번째 이미지', sortOrder: 0, isThumbnail: true },
  { id: 2, url: '/img/2.jpg', alt: '두번째 이미지', sortOrder: 1, isThumbnail: false },
]

describe('ImageGallery', () => {
  it('renders main image with first image alt', () => {
    render(<ImageGallery images={mockImages} />)
    const mainImage = screen.getAllByAltText('첫번째 이미지')[0]
    expect(mainImage).toBeInTheDocument()
    expect(mainImage).toHaveAttribute('src', '/img/1.jpg')
  })

  it('clicking second thumbnail changes main image src', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} />)

    const thumbnailBtn = screen.getByRole('button', { name: '이미지 2 선택' })
    await user.click(thumbnailBtn)

    const mainImages = screen.getAllByAltText('두번째 이미지')
    expect(mainImages[0]).toHaveAttribute('src', '/img/2.jpg')
  })

  it('shows fallback message when images are empty', () => {
    render(<ImageGallery images={[]} />)
    expect(screen.getByText('등록된 이미지가 없습니다')).toBeInTheDocument()
  })

  it('uses the explicit locale instead of ambient document language for SSR-stable text', () => {
    document.documentElement.lang = 'ko'

    render(<ImageGallery images={mockImages} locale="en" />)

    expect(screen.getByText('Zoom')).toBeInTheDocument()
    expect(screen.queryByText('확대')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select image 2' })).toBeInTheDocument()
  })

  it('server-renders English gallery copy when the route locale is English', () => {
    const html = renderToString(<ImageGallery images={mockImages} locale="en" />)

    expect(html).toContain('Zoom')
    expect(html).toContain('Open image 1 enlarged')
    expect(html).not.toContain('확대')
  })
})

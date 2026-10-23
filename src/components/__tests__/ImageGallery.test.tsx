import { fireEvent, render, screen } from '@testing-library/react'
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
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => <img src={src} alt={alt} className={className} />,
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

  it('clicking the next arrow changes main image src', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} />)

    const nextButton = screen.getByRole('button', { name: "Next image" })
    expect(nextButton).toHaveTextContent('NEXT')
    expect(nextButton.querySelector('svg')).toBeNull()
    await user.click(nextButton)

    const mainImages = screen.getAllByAltText('두번째 이미지')
    expect(mainImages[0]).toHaveAttribute('src', '/img/2.jpg')
    expect(screen.getByRole('button', { name: 'Select image 2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })

  it('keeps touch gestures on the photo out of the lightbox and provides an explicit zoom button', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} locale="en" />)
    const photo = screen.getAllByAltText('첫번째 이미지')[0]
    fireEvent.touchStart(photo, { touches: [{ clientX: 100, clientY: 200 }] })
    fireEvent.touchMove(photo, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(photo)
    await user.click(photo)
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zoom' }))
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('selects thumbnails without opening the lightbox and scrolls the main image', async () => {
    const user = userEvent.setup()
    render(<ImageGallery images={mockImages} />)
    const first = screen.getByRole('button', { name: 'Select image 1' })
    const second = screen.getByRole('button', { name: 'Select image 2' })

    expect(first).toHaveAttribute('aria-pressed', 'true')
    await user.click(second)
    expect(second).toHaveAttribute('aria-pressed', 'true')
    expect(first).toHaveAttribute('aria-pressed', 'false')
    expect(Element.prototype.scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps hover zoom but opens the lightbox only through its text control', async () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true, media: '(hover: hover) and (pointer: fine)', onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(),
      removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })
    try {
      const user = userEvent.setup()
      render(<ImageGallery images={mockImages} locale="en" />)
      const photo = screen.getAllByAltText('첫번째 이미지')[0]
      await user.hover(photo)
      expect(photo).toHaveClass('scale-150')
      await user.click(photo)
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
      const zoom = screen.getByRole('button', { name: 'Zoom' })
      expect(zoom).toHaveTextContent('Zoom')
      expect(zoom.querySelector('svg')).toBeNull()
      await user.click(zoom)
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })

  it('does not render a thumbnail strip for one image', () => {
    render(<ImageGallery images={mockImages.slice(0, 1)} />)
    expect(screen.queryByRole('button', { name: 'Select image 1' })).not.toBeInTheDocument()
  })

  it('shows fallback message when images are empty', () => {
    render(<ImageGallery images={[]} />)
    expect(screen.getByText("No images available")).toBeInTheDocument()
  })

  it('uses the explicit locale instead of ambient document language for SSR-stable text', () => {
    document.documentElement.lang = 'ko'

    render(<ImageGallery images={mockImages} locale="en" />)

    expect(screen.getByText('Zoom')).toBeInTheDocument()
    expect(screen.queryByText("Zoom in")).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select image 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next image' })).toBeInTheDocument()
  })

  it('server-renders English gallery copy when the route locale is English', () => {
    const html = renderToString(<ImageGallery images={mockImages} locale="en" />)

    expect(html).toContain('Zoom')
    expect(html).toContain('aria-label="Zoom"')
    expect(html).not.toContain("Zoom in")
  })
})

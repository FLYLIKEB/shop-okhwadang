import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ImageGallery from '@/components/products/ImageGallery'

vi.mock('next/image', () => ({
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

  it('shows fallback teapot images when images are empty', () => {
    render(<ImageGallery images={[]} />)
    const fallbackImage = screen.getAllByRole('img')[0]
    expect(fallbackImage).toBeInTheDocument()
    expect(fallbackImage).toHaveAttribute('alt', '자사호 — 전통 주니 자사호')
  })
})
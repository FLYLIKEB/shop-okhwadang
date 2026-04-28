import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProductDetailClient from '@/components/shared/products/ProductDetailClient'
import type { ProductDetail } from '@/lib/api'
import enMessages from '@/i18n/messages/en.json'

const { pushMock, toastSuccessMock, toastErrorMock, addCartItemMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  addCartItemMock: vi.fn(),
}))

const getMessage = (path: string): string => {
  const value = path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }

    return path
  }, enMessages.product as unknown)

  return typeof value === 'string' ? value : path
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    let message = getMessage(key)

    if (values) {
      for (const [token, value] of Object.entries(values)) {
        message = message.replace(`{${token}}`, String(value))
      }
    }

    return message
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem: addCartItemMock }),
}))

vi.mock('@/contexts/MobileNavContext', () => ({
  useMobileNav: () => ({ isVisible: true }),
}))

vi.mock('@/components/shared/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ addItem: vi.fn() }),
}))

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')

  return {
    ...actual,
    wishlistApi: {
      check: vi.fn().mockResolvedValue({ isWishlisted: false, wishlistId: null }),
      add: vi.fn().mockResolvedValue({ id: 101 }),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('@/components/shared/products/ImageGallery', () => ({
  default: () => <div data-testid="image-gallery" />,
}))

vi.mock('@/components/shared/products/OptionSelector', () => ({
  default: () => <div data-testid="option-selector" />,
}))

vi.mock('@/components/shared/products/QuantitySelector', () => ({
  default: ({ quantity }: { quantity: number }) => <div data-testid="quantity-selector">{quantity}</div>,
}))

vi.mock('@/components/shared/products/ProductTabs', () => ({
  default: () => <div data-testid="product-tabs" />,
}))

vi.mock('@/components/shared/reviews/StarRating', () => ({
  default: () => <div data-testid="star-rating" />,
}))

vi.mock('@/components/shared/common/PriceDisplay', () => ({
  default: ({ price }: { price: number }) => <div data-testid="price-display">{price}</div>,
}))

const product: ProductDetail = {
  id: 1,
  name: 'Handmade Teapot',
  slug: 'handmade-teapot',
  price: 120000,
  salePrice: null,
  shortDescription: 'Short description',
  rating: 4.8,
  reviewCount: 3,
  status: 'active',
  isFeatured: false,
  viewCount: 0,
  category: { id: 10, name: 'Teapots', slug: 'teapots', parentId: null, imageUrl: null },
  images: [{ id: 1, url: '/teapot.jpg', alt: 'Teapot', sortOrder: 0, isThumbnail: true, isDescriptionImage: false }],
  attributes: [],
  description: '<p>Detail</p>',
  stock: 12,
  sku: 'TP-001',
  options: [{ id: 11, name: 'Size', value: 'Large', priceAdjustment: 0, stock: 12, sortOrder: 0 }],
  detailImages: [],
}

describe('ProductDetailClient', () => {
  beforeEach(() => {
    addCartItemMock.mockResolvedValue(undefined)
  })

  it('renders translated PDP labels and no banned arbitrary utility classes', async () => {
    const { container } = render(<ProductDetailClient product={product} locale="en" />)

    expect(screen.getAllByText('Add to Cart')).toHaveLength(2)
    expect(screen.getAllByText('Buy Now')).toHaveLength(2)
    expect(screen.getByText('Quantity')).toBeInTheDocument()
    expect(screen.getByText('(3 review(s))')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Add to wishlist').length).toBeGreaterThan(0)

    await userEvent.click(screen.getAllByRole('button', { name: 'Add to Cart' })[0])

    expect(toastErrorMock).toHaveBeenCalledWith('Please select an option.')
    expect(container.innerHTML).not.toContain('text-[#')
    expect(container.innerHTML).not.toContain('border-[#')
    expect(container.innerHTML).not.toContain('max-w-8xl')
  })
})

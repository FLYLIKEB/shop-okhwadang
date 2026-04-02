import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductGridBlock from '@/components/blocks/ProductGridBlock';
import type { Product } from '@/lib/api';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img data-testid="next-image" {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/api', () => ({
  productsApi: {
    getList: vi.fn(),
    getById: vi.fn(),
    getBulk: vi.fn(),
    autocomplete: vi.fn(),
  },
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem: vi.fn(), items: [], itemCount: 0, totalAmount: 0, isLoading: false }),
}));

vi.mock('@/hooks/useWishlistToggle', () => ({
  useWishlistToggle: () => ({ isWishlisted: false, loading: false, toggle: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockProducts: Product[] = [
  {
    id: 1,
    name: '테스트 상품 1',
    slug: 'test-product-1',
    price: 29000,
    salePrice: null,
    status: 'active',
    isFeatured: true,
    viewCount: 100,
    category: null,
    images: [{ id: 1, url: '/img1.jpg', alt: null, sortOrder: 0, isThumbnail: true, isDescriptionImage: false }],
  },
  {
    id: 2,
    name: '테스트 상품 2',
    slug: 'test-product-2',
    price: 39000,
    salePrice: 29000,
    status: 'active',
    isFeatured: true,
    viewCount: 50,
    category: null,
    images: [{ id: 2, url: '/img2.jpg', alt: null, sortOrder: 0, isThumbnail: true, isDescriptionImage: false }],
  },
];

describe('ProductGridBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders products when prefetched_products is provided', async () => {
    const content = {
      limit: 4,
      template: '4col' as const,
      title: '테스트 상품',
      prefetched_products: mockProducts,
    };

    render(<ProductGridBlock content={content} />);

    await waitFor(() => {
      expect(screen.getByText('테스트 상품 1')).toBeInTheDocument();
      expect(screen.getByText('테스트 상품 2')).toBeInTheDocument();
    });
  });

  it('returns null when prefetched_products is empty array', () => {
    const content = {
      limit: 4,
      template: '4col' as const,
      prefetched_products: [],
    };

    const { container } = render(<ProductGridBlock content={content} />);
    expect(container.firstChild).toBeNull();
  });
});
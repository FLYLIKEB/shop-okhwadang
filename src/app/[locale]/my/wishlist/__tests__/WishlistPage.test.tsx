import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WishlistPage from '../page';

const mockPush = vi.fn();
const mockGetList = vi.fn();
const mockRemove = vi.fn();
const mockAddCart = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      title: '위시리스트',
      loadError: '위시리스트를 불러오지 못했습니다.',
      removeSuccess: '삭제되었습니다.',
      removeError: '삭제하지 못했습니다.',
      addCartSuccess: '장바구니에 담았습니다.',
      addCartError: '장바구니에 담지 못했습니다.',
      noItems: '위시리스트가 비었습니다.',
      noItemsDescription: '상품을 담아보세요.',
      goShopping: '쇼핑하러 가기',
      soldout: '품절',
      addToCart: '장바구니 담기',
      delete: '삭제',
    }[key] ?? key),
}));

vi.mock('@/components/shared/hooks/useRequireAuth', () => ({
  useRequireAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

vi.mock('@/lib/api', () => ({
  wishlistApi: {
    getList: (...args: unknown[]) => mockGetList(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
  cartApi: {
    add: (...args: unknown[]) => mockAddCart(...args),
  },
}));

const wishlistItem = {
  id: 1,
  productId: 10,
  createdAt: '2026-06-04T00:00:00.000Z',
  product: {
    id: 10,
    name: '자사호',
    slug: 'zisha-pot',
    price: 50000,
    salePrice: null,
    status: 'soldout',
    images: [{ url: 'https://example.com/broken.jpg', thumbnailUrl: null, alt: null, isThumbnail: true }],
  },
};

describe('WishlistPage product image presentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetList.mockResolvedValue({ data: [wishlistItem] });
  });

  it('renders wishlist product image frame and in-image badge without rounded corners', async () => {
    render(<WishlistPage />);

    await waitFor(() => {
      expect(screen.getByText('자사호')).toBeInTheDocument();
    });

    expect(screen.getByTestId('wishlist-product-image-frame')).not.toHaveClass('rounded-md');
    expect(screen.getByText('품절')).not.toHaveClass('rounded-md');
  });

  it('replaces a failed wishlist product image with the Okhwadang logo fallback on a neutral gray background', async () => {
    render(<WishlistPage />);

    const image = await screen.findByAltText('자사호');
    fireEvent.error(image);

    const fallback = screen.getByTestId('wishlist-product-image-fallback');
    expect(fallback).toHaveClass('bg-neutral-200');
    expect(screen.getByAltText('옥화당')).toHaveAttribute('src', '/logo-okhwadang.png');
    expect(screen.queryByAltText('자사호')).not.toBeInTheDocument();
  });

  it('uses the generated thumbnail URL when it is available', async () => {
    mockGetList.mockResolvedValueOnce({
      data: [{
        ...wishlistItem,
        product: {
          ...wishlistItem.product,
          images: [{ ...wishlistItem.product.images[0], thumbnailUrl: 'https://example.com/thumb.webp' }],
        },
      }],
    });

    render(<WishlistPage />);

    expect(await screen.findByAltText('자사호')).toHaveAttribute('src', 'https://example.com/thumb.webp');
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductDetailClient from '@/components/shared/products/ProductDetailClient';
import type { ProductDetail } from '@/lib/api';

const { pushMock, toastSuccessMock, toastErrorMock, addCartItemMock, wishlistAddMock, wishlistRemoveMock, wishlistCheckMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  addCartItemMock: vi.fn(),
  wishlistAddMock: vi.fn(),
  wishlistRemoveMock: vi.fn(),
  wishlistCheckMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const labels: Record<string, string> = {
      addToCart: '장바구니 담기',
      buyNow: '바로 구매',
      quantity: '수량',
      selectOption: '옵션을 선택하세요.',
      addToWishlistAria: '찜하기',
      removeFromWishlistAria: '찜 해제',
      addToCartSuccess: '장바구니에 담았습니다.',
      addToCartError: '장바구니 담기 실패',
      buyNowError: '바로 구매 실패',
      wishlistAddSuccess: '찜 추가됨',
      wishlistRemoveSuccess: '찜 해제됨',
      wishlistError: '찜 오류',
      reviewCount: `리뷰 ${values?.count ?? 0}건`,
      lowStock: `재고 ${values?.count ?? 0}개`,
      discountOff: `${values?.percent ?? 0}% 할인`,
      selectedQuantity: `수량 ${values?.quantity ?? 0}개`,
      totalProductPrice: '상품 합계',
      outOfStockMessage: '품절',
      clay: '진흙',
      shape: '모양',
    };
    return labels[key] ?? key;
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem: addCartItemMock }),
}));

vi.mock('@/contexts/MobileNavContext', () => ({
  useMobileNav: () => ({ isVisible: true }),
}));

vi.mock('@/components/shared/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({ addItem: vi.fn() }),
}));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    wishlistApi: {
      check: wishlistCheckMock,
      add: wishlistAddMock,
      remove: wishlistRemoveMock,
    },
  };
});

vi.mock('@/components/shared/products/ImageGallery', () => ({
  default: () => <div data-testid="image-gallery" />,
}));

vi.mock('@/components/shared/products/OptionSelector', () => ({
  default: ({
    options,
    onSelect,
  }: {
    options: Array<{ id: number; name: string; value: string }>;
    selectedOptionId: number | null;
    onSelect: (id: number) => void;
  }) => (
    <div data-testid="option-selector">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onSelect(o.id)}>
          {o.name}-{o.value}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/shared/products/QuantitySelector', () => ({
  default: ({
    quantity,
    onIncrease,
    onDecrease,
  }: {
    quantity: number;
    maxQuantity: number;
    onIncrease: () => void;
    onDecrease: () => void;
  }) => (
    <div data-testid="quantity-selector">
      <button type="button" onClick={onDecrease}>-</button>
      <span data-testid="qty-value">{quantity}</span>
      <button type="button" onClick={onIncrease}>+</button>
    </div>
  ),
}));

vi.mock('@/components/shared/products/ProductTabs', () => ({
  default: () => <div data-testid="product-tabs" />,
}));

vi.mock('@/components/shared/reviews/StarRating', () => ({
  default: () => <div data-testid="star-rating" />,
}));

vi.mock('@/components/shared/common/PriceDisplay', () => ({
  default: ({ price }: { price: number }) => <div data-testid="price-display">{price}</div>,
}));

const productWithOptions: ProductDetail = {
  id: 1,
  name: '핸드메이드 자사호',
  slug: 'handmade-teapot',
  price: 120000,
  salePrice: null,
  shortDescription: '짧은 설명',
  rating: 4.8,
  reviewCount: 3,
  status: 'active',
  isFeatured: false,
  viewCount: 0,
  category: { id: 10, name: '자사호', slug: 'teapots', parentId: null, imageUrl: null },
  images: [{ id: 1, url: '/teapot.jpg', alt: 'Teapot', sortOrder: 0, isThumbnail: true, isDescriptionImage: false }],
  attributes: [],
  description: '<p>본문</p>',
  stock: 12,
  sku: 'TP-001',
  options: [
    { id: 11, name: '크기', value: '대', priceAdjustment: 0, stock: 12, sortOrder: 0 },
    { id: 12, name: '크기', value: '소', priceAdjustment: -10000, stock: 5, sortOrder: 1 },
  ],
  detailImages: [],
};

const productWithoutOptions: ProductDetail = {
  ...productWithOptions,
  options: [],
};

const soldoutProduct: ProductDetail = {
  ...productWithOptions,
  status: 'soldout',
};

describe('ProductDetailClient', () => {
  beforeEach(() => {
    addCartItemMock.mockReset();
    addCartItemMock.mockResolvedValue(undefined);
    wishlistCheckMock.mockReset();
    wishlistCheckMock.mockResolvedValue({ isWishlisted: false, wishlistId: null });
    wishlistAddMock.mockReset();
    wishlistAddMock.mockResolvedValue({ id: 999 });
    wishlistRemoveMock.mockReset();
    pushMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('옵션 미선택 + 장바구니 담기 → 에러 토스트, addItem 호출 안 됨', async () => {
    render(<ProductDetailClient product={productWithOptions} locale="ko" />);
    await userEvent.click(screen.getAllByRole('button', { name: '장바구니 담기' })[0]);
    expect(toastErrorMock).toHaveBeenCalledWith('옵션을 선택하세요.');
    expect(addCartItemMock).not.toHaveBeenCalled();
  });

  it('옵션 선택 후 장바구니 담기 → addItem 호출', async () => {
    render(<ProductDetailClient product={productWithOptions} locale="ko" />);
    await userEvent.click(screen.getByRole('button', { name: '크기-대' }));
    await userEvent.click(screen.getAllByRole('button', { name: '장바구니 담기' })[0]);
    await waitFor(() => {
      expect(addCartItemMock).toHaveBeenCalledWith({
        productId: 1,
        productOptionId: 11,
        quantity: 1,
      });
    });
  });

  it('옵션 없는 상품 → 옵션 선택 없이 장바구니 담기 가능', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);
    await userEvent.click(screen.getAllByRole('button', { name: '장바구니 담기' })[0]);
    await waitFor(() => {
      expect(addCartItemMock).toHaveBeenCalledWith({
        productId: 1,
        productOptionId: null,
        quantity: 1,
      });
    });
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it('바로 구매 → addItem + router.push("/checkout")', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);
    await userEvent.click(screen.getAllByRole('button', { name: '바로 구매' })[0]);
    await waitFor(() => {
      expect(addCartItemMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/checkout');
    });
  });

  it('수량 증가 버튼 → quantity 1→2', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);
    expect(screen.getByTestId('qty-value')).toHaveTextContent('1');
    await userEvent.click(screen.getAllByRole('button', { name: '+' })[0]);
    expect(screen.getByTestId('qty-value')).toHaveTextContent('2');
  });

  it('수량 1 에서 감소 버튼 → 1 유지 (최소값)', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);
    await userEvent.click(screen.getAllByRole('button', { name: '-' })[0]);
    expect(screen.getByTestId('qty-value')).toHaveTextContent('1');
  });

  it('품절 상품 → 장바구니/바로구매 disabled + 안내 메시지', () => {
    render(<ProductDetailClient product={soldoutProduct} locale="ko" />);
    const cartButtons = screen.getAllByRole('button', { name: '장바구니 담기' });
    cartButtons.forEach((btn) => expect(btn).toBeDisabled());
    expect(screen.getByText('품절')).toBeInTheDocument();
  });

  it('찜 추가 → wishlistApi.add 호출 + 성공 토스트', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);
    // wishlist check 결과 처리 대기
    await waitFor(() => expect(wishlistCheckMock).toHaveBeenCalled());
    await userEvent.click(screen.getAllByLabelText('찜하기')[0]);
    await waitFor(() => {
      expect(wishlistAddMock).toHaveBeenCalledWith(1);
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('찜 추가됨');
  });
});

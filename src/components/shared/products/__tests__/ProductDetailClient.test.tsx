import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductDetailClient, { buildBuyNowCheckoutItem } from '@/components/shared/products/ProductDetailClient';
import type { ProductDetail } from '@/lib/api';
import { SESSION_KEYS } from '@/constants/storage';

const {
  pushMock,
  toastSuccessMock,
  toastErrorMock,
  addCartItemMock,
  wishlistAddMock,
  wishlistRemoveMock,
  wishlistCheckMock,
  mockUseAuth,
  mockPathname,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  addCartItemMock: vi.fn(),
  wishlistAddMock: vi.fn(),
  wishlistRemoveMock: vi.fn(),
  wishlistCheckMock: vi.fn(),
  mockUseAuth: vi.fn(() => ({ isAuthenticated: true, isLoading: false, user: { id: 1, email: 'test@example.com', name: '테스터', role: 'user' } })),
  mockPathname: vi.fn(() => '/ko/products/1'),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    locale = 'ko',
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; locale?: string }) => (
    <a href={`/${locale}${href}`} {...props}>{children}</a>
  ),
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
      ratingSummary: `${values?.rating ?? 0}(${values?.count ?? 0})`,
      reviewCount: `리뷰 ${values?.count ?? 0}건`,
      lowStock: `재고 ${values?.count ?? 0}개`,
      discountOff: `${values?.percent ?? 0}% 할인`,
      outOfStockMessage: '품절',
      'stockStatus.title': '재고 안내',
      'stockStatus.soldoutReason': '품절',
      'stockStatus.lowStock': `재고 ${values?.count ?? 0}개`,
      'stockStatus.available': '구매 가능',
      'stockStatus.restockNotice': '재입고 알림 준비 중',
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
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
  category: { id: 10, name: '자사호', slug: 'teapots', description: '<b>카테고리 소개</b><script>alert(1)</script>', parentId: null, imageUrl: null },
  images: [{ id: 1, url: '/teapot.jpg', alt: 'Teapot', sortOrder: 0, isThumbnail: true, isDescriptionImage: false }],
  attributes: [],
  description: '<p>본문</p>',
  stock: 12,
  sku: 'TP-001',
  noticeInfo: null,
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
    mockPathname.mockReset();
    mockPathname.mockReturnValue('/ko/products/1');
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, email: 'test@example.com', name: '테스터', role: 'user' },
    });
  });

  it('separates guidance, gallery, description and purchase content without duplicating purchase state', async () => {
    const { container } = render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);

    const galleryWrapper = screen.getByTestId('image-gallery').parentElement;

    expect(galleryWrapper).toHaveClass('editorial-product-gallery');
    expect(container.querySelectorAll('.editorial-product-guide')).toHaveLength(1);
    expect(container.querySelectorAll('.editorial-product-purchase')).toHaveLength(1);
    expect(screen.getAllByText(productWithoutOptions.name)).toHaveLength(1);
    expect(screen.queryByText(productWithoutOptions.sku!)).not.toBeInTheDocument();
    expect(container.querySelectorAll('.editorial-product-description')).toHaveLength(1);
    expect(screen.queryByText('카테고리 소개')).not.toBeInTheDocument();
    expect(galleryWrapper?.querySelector('script')).toBeNull();
    await waitFor(() => expect(screen.getByText('본문').closest('.editorial-product-guide')).toBeInTheDocument());
    expect(galleryWrapper).not.toHaveTextContent('본문');
    await waitFor(() => expect(container.querySelectorAll('.product-detail-html')).toHaveLength(1));
  });

  it('places clay and shape attributes below the gallery instead of in the purchase panel', () => {
    const product: ProductDetail = {
      ...productWithoutOptions,
      attributes: [
        { id: 101, attributeTypeId: 1, value: 'old_duanni', displayValue: '노단니', sortOrder: 0,
          attributeType: { id: 1, code: 'clay_type', name: 'Clay', nameKo: '니료', inputType: 'select', isFilterable: true, isSearchable: true, validValues: null, sortOrder: 0 } },
        { id: 102, attributeTypeId: 2, value: 'lianzi', displayValue: '연자호', sortOrder: 1,
          attributeType: { id: 2, code: 'teapot_shape', name: 'Shape', nameKo: '모양', inputType: 'select', isFilterable: true, isSearchable: true, validValues: null, sortOrder: 0 } },
      ],
    };
    const { container } = render(<ProductDetailClient product={product} locale="ko" attributeDescriptions={{ 101: '<b>니료 설명</b><script>alert(1)</script>', 102: '모양 설명' }} />);
    const gallery = container.querySelector('.editorial-product-gallery');
    expect(screen.getByText('진흙: 노단니').closest('.editorial-product-gallery')).toBe(gallery);
    expect(screen.getByText('모양: 연자호').closest('.editorial-product-gallery')).toBe(gallery);
    expect(container.querySelector('.editorial-product-purchase')).not.toHaveTextContent('노단니');
    expect(screen.getByText('니료 설명').closest('.editorial-product-gallery')).toBe(gallery);
    expect(screen.getByText('모양 설명').closest('.editorial-product-gallery')).toBe(gallery);
    expect(gallery?.querySelector('script')).toBeNull();
    expect(screen.getByRole('link', { name: '진흙: 노단니' })).toHaveAttribute('href', '/ko/products?attrs=clay_type:old_duanni');
  });

  it('옵션 미선택 + 장바구니 담기 → 에러 토스트, addItem 호출 안 됨', async () => {
    render(<ProductDetailClient product={productWithOptions} locale="ko" />);
    await userEvent.click(screen.getAllByRole('button', { name: '장바구니 담기' })[0]);
    expect(toastErrorMock).toHaveBeenCalledWith('옵션을 선택하세요.');
    expect(addCartItemMock).not.toHaveBeenCalled();
  });

  it('옵션 선택 후 장바구니 담기 → addItem 호출', async () => {
    render(<ProductDetailClient product={productWithOptions} locale="ko" />);
    await userEvent.click(screen.getAllByRole('button', { name: '크기-대' })[0]);
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

  it('회원 바로 구매는 선택한 옵션 한 건만 checkout session에 저장하고 장바구니를 변경하지 않는다', async () => {
    sessionStorage.setItem(SESSION_KEYS.CHECKOUT_ITEMS, JSON.stringify([{ id: 999 }]));
    render(<ProductDetailClient product={productWithOptions} locale="ko" />);
    await userEvent.click(screen.getAllByRole('button', { name: '크기-소' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: '+' })[0]);
    await userEvent.click(screen.getAllByRole('button', { name: '바로 구매' })[0]);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/checkout', { locale: 'ko' });
    });

    expect(addCartItemMock).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEYS.CHECKOUT_ITEMS) ?? '')).toEqual([
      {
        id: -1,
        productId: 1,
        productOptionId: 12,
        checkoutSource: 'buy_now',
        quantity: 2,
        unitPrice: 110000,
        subtotal: 220000,
        product: {
          id: 1,
          name: '핸드메이드 자사호',
          slug: 'handmade-teapot',
          price: 120000,
          salePrice: null,
          status: 'active',
          images: productWithOptions.images,
        },
        option: {
          id: 12,
          name: '크기',
          value: '소',
          priceAdjustment: -10000,
        },
      },
    ]);
  });

  it('잘못된 바로 구매 선택은 checkout payload를 만들지 않는다', () => {
    expect(() => buildBuyNowCheckoutItem(productWithOptions, undefined, 1)).toThrow(
      'Invalid buy-now product option',
    );
    expect(() => buildBuyNowCheckoutItem(productWithoutOptions, undefined, 0)).toThrow(
      'Invalid buy-now product selection',
    );
    expect(() => buildBuyNowCheckoutItem({ ...productWithoutOptions, price: Number.NaN }, undefined, 1)).toThrow(
      'Invalid buy-now product selection',
    );
    expect(() => buildBuyNowCheckoutItem(
      { ...productWithoutOptions, price: null } as unknown as ProductDetail,
      undefined,
      1,
    )).toThrow('Invalid buy-now product selection');
    expect(buildBuyNowCheckoutItem(
      productWithOptions,
      { ...productWithOptions.options[0], name: 'forged', priceAdjustment: 999999 },
      1,
    )).toEqual(expect.objectContaining({
      productOptionId: 11,
      unitPrice: 120000,
      option: expect.objectContaining({ name: '크기', priceAdjustment: 0 }),
    }));
    expect(() => buildBuyNowCheckoutItem(productWithOptions, productWithOptions.options[1], 6)).toThrow(
      'Invalid buy-now product selection',
    );
    const runtimeShaped = {
      ...productWithOptions,
      id: '1',
      price: '120000.00',
      salePrice: '110000.00',
      stock: '12',
      options: [{
        ...productWithOptions.options[0],
        id: '11',
        priceAdjustment: '5000.00',
        stock: '12',
      }],
    } as unknown as ProductDetail;
    expect(buildBuyNowCheckoutItem(
      runtimeShaped,
      runtimeShaped.options[0],
      2,
    )).toEqual(expect.objectContaining({
      id: -1,
      productId: 1,
      productOptionId: 11,
      unitPrice: 115000,
      subtotal: 230000,
      option: expect.objectContaining({ priceAdjustment: 5000 }),
    }));
  });

  it('빠른 바로 구매 반복은 session 저장과 navigation을 한 번만 실행한다', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const button = screen.getAllByRole('button', { name: '바로 구매' })[0];

    await userEvent.dblClick(button);
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    const checkoutWrites = setItemSpy.mock.calls.filter(
      ([key]) => key === SESSION_KEYS.CHECKOUT_ITEMS,
    );
    expect(checkoutWrites).toHaveLength(1);
    expect(setItemSpy.mock.invocationCallOrder[0]).toBeLessThan(
      pushMock.mock.invocationCallOrder[0],
    );
    setItemSpy.mockRestore();
  });

  it('checkout session 저장 실패 시 navigation하지 않고 다시 시도할 수 있다', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementationOnce(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });

    await userEvent.click(screen.getAllByRole('button', { name: '바로 구매' })[0]);
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalled();
    setItemSpy.mockRestore();

    await userEvent.click(screen.getAllByRole('button', { name: '바로 구매' })[0]);
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
  });

  it('English 바로 구매 keeps checkout navigation under /en', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="en" />);
    await userEvent.click(screen.getAllByRole('button', { name: '바로 구매' })[0]);
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/checkout', { locale: 'en' });
    });
  });

  it('수량 증가 버튼 → quantity 1→2', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);
    expect(screen.getAllByTestId('qty-value')).toHaveLength(1);
    expect(screen.getAllByTestId('qty-value')[0]).toHaveTextContent('1');
    await userEvent.click(screen.getAllByRole('button', { name: '+' })[0]);
    expect(screen.getAllByTestId('qty-value')).toHaveLength(1);
    screen.getAllByTestId('qty-value').forEach((value) => expect(value).toHaveTextContent('2'));
  });

  it('수량 1 에서 감소 버튼 → 1 유지 (최소값)', async () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);
    await userEvent.click(screen.getAllByRole('button', { name: '-' })[0]);
    screen.getAllByTestId('qty-value').forEach((value) => expect(value).toHaveTextContent('1'));
  });

  it('places one shared option/quantity and stacked purchase actions before community links and description', () => {
    const { container } = render(<ProductDetailClient product={productWithOptions} locale="ko" />);
    const purchase = container.querySelector('.editorial-product-purchase')!;
    const options = screen.getByTestId('option-selector');
    const quantity = screen.getByTestId('quantity-selector');
    const buy = screen.getByRole('button', { name: '바로 구매' });
    const cart = screen.getByRole('button', { name: '장바구니 담기' });
    const communityLinks = screen.getByRole('navigation', { name: 'tabs.navigationLabel' });
    const description = container.querySelector('.editorial-product-guide')!;
    for (const [before, after] of [[options, quantity], [quantity, buy], [buy, cart], [cart, communityLinks], [communityLinks, description]]) {
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(purchase).toContainElement(options);
    expect(options.parentElement).not.toHaveClass('hidden');
    expect(quantity.parentElement).not.toHaveClass('hidden');
    expect(buy.parentElement).toHaveClass('grid', 'grid-cols-1');
    expect(buy.parentElement).not.toHaveClass('hidden');
    expect(container.querySelector('.fixed')).toBeNull();
    expect(screen.getAllByTestId('quantity-selector')).toHaveLength(1);
    expect(screen.queryByText('TP-001')).not.toBeInTheDocument();
  });

  it('선택 옵션 뒤에 중복 총 상품금액을 표시하지 않는다', async () => {
    render(<ProductDetailClient product={productWithOptions} locale="ko" />);

    await userEvent.click(screen.getAllByRole('button', { name: '크기-대' })[0]);

    expect(screen.queryByText('상품 합계')).not.toBeInTheDocument();
  });

  it('상품상세 별점에 회색 배경을 표시하지 않는다', () => {
    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);

    expect(screen.getByText('4.8(3)').parentElement).not.toHaveClass('bg-muted/40');
  });

  it('normalizes serialized decimal prices before rendering totals', async () => {
    const serializedProduct = {
      ...productWithOptions,
      price: '580000.00',
      salePrice: null,
      stock: '3',
      options: [{
        ...productWithOptions.options[0],
        priceAdjustment: '30000.00',
        stock: '2',
      }],
    } as unknown as ProductDetail;

    render(<ProductDetailClient product={serializedProduct} locale="ko" />);

    expect(screen.getByTestId('price-display')).toHaveTextContent('580000');
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: '크기-대' })[0]);
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('품절 상품 → 장바구니/바로구매 disabled + 안내 메시지', () => {
    render(<ProductDetailClient product={soldoutProduct} locale="ko" />);
    const cartButtons = screen.getAllByRole('button', { name: '장바구니 담기' });
    cartButtons.forEach((btn) => expect(btn).toBeDisabled());
    expect(screen.getByText('품절')).toBeInTheDocument();
  });

  it('상품속성을 텍스트로 표시하고 속성 필터 링크로 연결한다', () => {
    render(
      <ProductDetailClient
        product={{
          ...productWithoutOptions,
          attributes: [
            {
              id: 101,
              attributeTypeId: 1,
              value: 'old_duanni',
              displayValue: '노단니',
              sortOrder: 0,
              attributeType: {
                id: 1,
                code: 'clay_type',
                name: 'Clay Type',
                nameKo: '니료',
                inputType: 'select',
                isFilterable: true,
                isSearchable: false,
                validValues: null,
                sortOrder: 1,
              },
            },
            {
              id: 102,
              attributeTypeId: 2,
              value: 'lianzi',
              displayValue: '연자호',
              sortOrder: 1,
              attributeType: {
                id: 2,
                code: 'teapot_shape',
                name: 'Shape',
                nameKo: '모양',
                inputType: 'select',
                isFilterable: true,
                isSearchable: false,
                validValues: null,
                sortOrder: 2,
              },
            },
          ],
        }}
        locale="ko"
      />,
    );

    const clayLink = screen.getByRole('link', { name: '진흙: 노단니' });
    expect(clayLink).toHaveAttribute(
      'href',
      '/ko/products?attrs=clay_type:old_duanni',
    );
    expect(clayLink).not.toHaveClass('tag-danni');
    expect(screen.getByRole('link', { name: '모양: 연자호' })).toHaveAttribute(
      'href',
      '/ko/products?attrs=teapot_shape:lianzi',
    );
  });

  it('preserves Hanja and unknown clay filter values without colored badges', () => {
    const clayAttributeType = {
      id: 1,
      code: 'clay_type',
      name: 'Clay Type',
      nameKo: '니료',
      inputType: 'select' as const,
      isFilterable: true,
      isSearchable: false,
      validValues: null,
      sortOrder: 1,
    };

    render(
      <ProductDetailClient
        product={{
          ...productWithoutOptions,
          attributes: [
            {
              id: 201,
              attributeTypeId: 1,
              value: '朱泥',
              displayValue: '주니',
              sortOrder: 0,
              attributeType: clayAttributeType,
            },
            {
              id: 202,
              attributeTypeId: 1,
              value: 'mystery-clay',
              displayValue: '미상',
              sortOrder: 1,
              attributeType: clayAttributeType,
            },
          ],
        }}
        locale="ko"
      />,
    );

    const knownClay = screen.getByRole('link', { name: '진흙: 주니' });
    const unknownClay = screen.getByRole('link', { name: '진흙: 미상' });
    expect(knownClay).toHaveAttribute('href', `/ko/products?attrs=clay_type:${encodeURIComponent('朱泥')}`);
    expect(unknownClay).toHaveAttribute('href', '/ko/products?attrs=clay_type:mystery-clay');
    expect(knownClay).not.toHaveClass('tag-zuni');
    expect(unknownClay).not.toHaveClass('tag-generic');
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

  it('비로그인 찜 클릭 → 로그인으로 리다이렉트하고 wishlist API를 호출하지 않음', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: { id: 1, email: 'test@example.com', name: '테스터', role: 'user' },
    });

    render(<ProductDetailClient product={productWithoutOptions} locale="ko" />);

    expect(wishlistCheckMock).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByLabelText('찜하기')[0]);

    expect(pushMock).toHaveBeenCalledWith('/login?redirect=%2Fko%2Fproducts%2F1');
    expect(wishlistAddMock).not.toHaveBeenCalled();
    expect(wishlistRemoveMock).not.toHaveBeenCalled();
  });

  it('English 비로그인 찜 클릭 → locale-aware login redirect로 이동', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: { id: 1, email: 'test@example.com', name: '테스터', role: 'user' },
    });
    mockPathname.mockReturnValue('/en/products/1');

    render(<ProductDetailClient product={productWithoutOptions} locale="en" />);

    await userEvent.click(screen.getAllByLabelText('찜하기')[0]);

    expect(pushMock).toHaveBeenCalledWith('/login?redirect=%2Fen%2Fproducts%2F1');
    expect(wishlistAddMock).not.toHaveBeenCalled();
    expect(wishlistRemoveMock).not.toHaveBeenCalled();
  });
});

it('keeps dedicated English buy-now USD separate from its KRW payment amount', () => {
  const item = buildBuyNowCheckoutItem({ ...productWithoutOptions, priceUsd: 12.34, salePriceUsd: 10.25, pricingKrwPerUsd: 2000 }, undefined, 2, 'en');
  expect(item).toMatchObject({ unitPriceUsd: 10.25, pricingKrwPerUsd: 2000, unitPrice: 20500, subtotal: 41000 });
  expect(item.product.price).toBe(productWithoutOptions.price);
});

it('rejects an option that makes the dedicated English buy-now amount negative', () => {
  const product = { ...productWithOptions, price: 10000, priceUsd: 1, pricingKrwPerUsd: 1350,
    options: productWithOptions.options.map((option) => ({ ...option, priceAdjustment: -2000 })) };
  expect(() => buildBuyNowCheckoutItem(product, product.options[0], 1, 'en')).toThrow('Invalid buy-now product selection');
});

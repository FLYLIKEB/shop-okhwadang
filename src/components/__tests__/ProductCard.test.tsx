import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { wishlistApi } from '@/lib/api';
import ProductCard from '@/components/shared/products/ProductCard';
import type { AuthContextValue } from '@/contexts/AuthContext';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img data-fill={fill ? 'true' : undefined} {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} onClick={(e) => e.preventDefault()}>{children}</a>
  ),
}));

const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  usePathname: () => '/en/products',
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    locale = 'ko',
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; locale?: string }) => (
    <a href={`/${locale}${href}`} onClick={(e) => e.preventDefault()} {...props}>{children}</a>
  ),
  useRouter: () => ({ push: mockRouterPush }),
}));

const mockAddItem = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem: mockAddItem, items: [], itemCount: 0, totalAmount: 0, isLoading: false }),
}));

const mockUseAuth = vi.fn(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null as AuthContextValue['user'],
  logout: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const translations: Record<string, string> = {
  addToCart: '장바구니 담기',
  addingToCart: '담는 중...',
  discountOff: '{percent}% 할인',
  toggleOn: '찜하기',
  toggleOff: '찜 해제',
  'stockStatus.soldout': '품절',
  'stockStatus.soldoutReason': '현재 재고가 없어 구매할 수 없습니다.',
};

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const template = translations[key] ?? key;
    if (!values) return template;
    return Object.entries(values).reduce(
      (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
      template,
    );
  },
}));

vi.mock('@/lib/api', () => ({
  wishlistApi: {
    add: vi.fn(),
    remove: vi.fn(),
    getList: vi.fn(),
    check: vi.fn(),
  },
}));

describe('ProductCard', () => {
  const baseProps = {
    id: 1,
    name: '테스트 상품',
    price: 29000,
    salePrice: null,
    status: 'active' as const,
    images: [{ id: 1, url: '/img/test.jpg', thumbnailUrl: null, alt: null, sortOrder: 0, isThumbnail: true, isDescriptionImage: false }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/en/products');
    mockRouterPush.mockReset();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      logout: vi.fn(),
    });
  });

  it('shows price only when no sale price', () => {
    render(<ProductCard {...baseProps} />);
    expect(screen.getByText('₩29,000')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('shows sale price, original price strikethrough, and discount percentage', () => {
    render(<ProductCard {...baseProps} salePrice={24000} />);
    expect(screen.getByText('₩24,000')).toBeInTheDocument();
    expect(screen.getByText('₩29,000')).toBeInTheDocument();
    expect(screen.getByText('17% 할인')).toBeInTheDocument();
  });

  it('shows soldout badge when status is soldout', () => {
    render(<ProductCard {...baseProps} status="soldout" />);
    expect(screen.getByText('품절')).toBeInTheDocument();
  });

  it('renders the Okhwadang logo fallback when images are empty', () => {
    render(<ProductCard {...baseProps} images={[]} />);
    expect(screen.getByAltText('옥화당')).toHaveAttribute('src', '/logo-okhwadang.png');
  });

  it('links to the product detail page', () => {
    render(<ProductCard {...baseProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/ko/products/1');
  });

  it('links to the English product detail page when rendered with locale en', () => {
    render(<ProductCard {...baseProps} locale="en" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/en/products/1');
  });

  it('shows wishlist button', () => {
    render(<ProductCard {...baseProps} />);
    expect(screen.getByRole('button', { name: '찜하기' })).toBeInTheDocument();
  });

  it('shows add to cart button for active product', () => {
    render(<ProductCard {...baseProps} />);
    expect(screen.getByRole('button', { name: '장바구니 담기' })).toBeInTheDocument();
  });

  it('shows soldout overlay when status is soldout', () => {
    render(<ProductCard {...baseProps} status="soldout" />);
    expect(screen.getByText('품절')).toBeInTheDocument();
  });

  it('redirects to login when unauthenticated user clicks wishlist', async () => {
    render(<ProductCard {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: '찜하기' }));
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/login?redirect=%2Fen%2Fproducts', { locale: 'en' });
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('calls wishlistApi.add and shows toast on wishlist click when authenticated', async () => {
    window.history.pushState({}, '', '/ko/products');
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1, email: 'test@example.com', name: '테스터', role: 'user' },
      logout: vi.fn(),
    });
    vi.mocked(wishlistApi.add).mockResolvedValue({ id: 10, productId: 1, createdAt: '' });
    render(<ProductCard {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: '찜하기' }));
    await waitFor(() => {
      expect(wishlistApi.add).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith('위시리스트에 추가되었습니다.');
    });
  });
});

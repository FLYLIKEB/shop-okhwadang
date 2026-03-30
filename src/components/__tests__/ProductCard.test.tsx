import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'sonner';
import { wishlistApi } from '@/lib/api';
import ProductCard from '@/components/products/ProductCard';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img data-fill={fill ? 'true' : undefined} {...rest} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockAddItem = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({ addItem: mockAddItem, items: [], itemCount: 0, totalAmount: 0, isLoading: false }),
}));

const mockUseAuth = vi.fn(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  logout: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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
    images: [{ id: 1, url: '/img/test.jpg', alt: null, sortOrder: 0, isThumbnail: true }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      logout: vi.fn(),
    });
  });

  it('shows price only when no sale price', () => {
    render(<ProductCard {...baseProps} />);
    expect(screen.getByText('29,000원')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('shows sale price, original price strikethrough, and discount percentage', () => {
    render(<ProductCard {...baseProps} salePrice={24000} />);
    expect(screen.getByText('24,000원')).toBeInTheDocument();
    expect(screen.getByText('29,000원')).toBeInTheDocument();
    expect(screen.getByText('17%')).toBeInTheDocument();
  });

  it('shows soldout badge when status is soldout', () => {
    render(<ProductCard {...baseProps} status="soldout" />);
    expect(screen.getByText('품절')).toBeInTheDocument();
  });

  it('renders without crashing when images are empty', () => {
    render(<ProductCard {...baseProps} images={[]} />);
    expect(screen.getByText('No Image')).toBeInTheDocument();
  });

  it('links to the product detail page', () => {
    render(<ProductCard {...baseProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/1');
  });

  it('shows wishlist button', () => {
    render(<ProductCard {...baseProps} />);
    expect(screen.getByRole('button', { name: '찜하기' })).toBeInTheDocument();
  });

  it('shows cart button for active product', () => {
    render(<ProductCard {...baseProps} />);
    expect(screen.getByRole('button', { name: '장바구니 담기' })).toBeInTheDocument();
  });

  it('hides cart button when soldout', () => {
    render(<ProductCard {...baseProps} status="soldout" />);
    expect(screen.queryByRole('button', { name: '장바구니 담기' })).not.toBeInTheDocument();
  });

  it('calls addItem and shows toast on cart button click', async () => {
    mockAddItem.mockResolvedValue(undefined);
    render(<ProductCard {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: '장바구니 담기' }));
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith({ productId: 1, productOptionId: null, quantity: 1 });
      expect(toast.success).toHaveBeenCalledWith('장바구니에 담았습니다.');
    });
  });

  it('shows error toast when cart add fails', async () => {
    mockAddItem.mockRejectedValue(new Error('fail'));
    render(<ProductCard {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: '장바구니 담기' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('장바구니 담기에 실패했습니다.');
    });
  });

  it('shows login error toast when unauthenticated user clicks wishlist', async () => {
    render(<ProductCard {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: '찜하기' }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('로그인이 필요합니다.');
    });
  });

  it('calls wishlistApi.add and shows toast on wishlist click when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 1 },
      logout: vi.fn(),
    });
    vi.mocked(wishlistApi.add).mockResolvedValue({ id: 10, productId: 1, createdAt: '' });
    render(<ProductCard {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: '찜하기' }));
    await waitFor(() => {
      expect(wishlistApi.add).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith('찜 목록에 추가했습니다.');
    });
  });
});

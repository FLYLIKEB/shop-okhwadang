import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CartPage from '@/app/[locale]/cart/page';
import type { CartItem } from '@/lib/api';
import { toast } from 'sonner';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const dict: Record<string, string> = {
      title: '장바구니',
      empty: '장바구니가 비었습니다',
      emptyDescription: '마음에 드는 상품을 장바구니에 담아보세요.',
      requireLogin: '로그인이 필요합니다',
      requireLoginDescription: '장바구니를 이용하려면 로그인해주세요.',
      loginAction: '로그인',
      continueShopping: '쇼핑 계속하기',
      selectAll: '전체 선택',
      orderSummary: '주문 요약',
      selectedItems: '선택 상품',
      productAmount: '상품 금액',
      shippingFee: '배송비',
      total: '합계',
      orderSelected: '선택 상품 주문하기',
      selectItemsToOrder: '주문할 상품을 선택해주세요.',
      freeShipping: '무료',
      freeShippingUnlocked: '무료배송이 적용되었습니다.',
      freeShippingRemaining: `${values?.amount ?? ''} 더 담으면 무료배송`,
    };
    return dict[key] ?? key;
  },
}));

// ---- next/navigation ----
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ---- sonner ----
vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ---- contexts ----
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthContext: {},
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockUseCart = vi.fn();
vi.mock('@/contexts/CartContext', () => ({
  useCart: () => mockUseCart(),
  CartContext: {},
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/MobileNavContext', () => ({
  useMobileNav: () => ({ isVisible: false }),
}));

// ---- next/image ----
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img data-fill={fill ? 'true' : undefined} {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

const cartItem1: CartItem = {
  id: 1,
  productId: 10,
  productOptionId: null,
  quantity: 1,
  unitPrice: 20000,
  subtotal: 20000,
  product: {
    id: 10,
    name: '상품 A',
    slug: 'product-a',
    price: 20000,
    salePrice: null,
    status: 'active',
    images: [],
  },
  option: null,
};

const cartItem2: CartItem = {
  id: 2,
  productId: 11,
  productOptionId: null,
  quantity: 2,
  unitPrice: 10000,
  subtotal: 20000,
  product: {
    id: 11,
    name: '상품 B',
    slug: 'product-b',
    price: 10000,
    salePrice: null,
    status: 'active',
    images: [],
  },
  option: null,
};

const defaultCart = {
  items: [],
  itemCount: 0,
  totalAmount: 0,
  isLoading: false,
  addItem: vi.fn(),
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  refetch: vi.fn(),
};

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows login EmptyState when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    mockUseCart.mockReturnValue(defaultCart);

    render(<CartPage />);
    expect(screen.getByText('로그인이 필요합니다')).toBeInTheDocument();
  });

  it('shows empty cart EmptyState when authenticated but no items', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [] });

    render(<CartPage />);
    expect(screen.getByText('장바구니가 비었습니다')).toBeInTheDocument();
  });

  it('renders CartItemRow list when items exist', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1, cartItem2] });

    render(<CartPage />);
    expect(screen.getByText('상품 A')).toBeInTheDocument();
    expect(screen.getByText('상품 B')).toBeInTheDocument();
  });

  it('calculates selected total for checked items', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1, cartItem2] });

    render(<CartPage />);

    const checkboxes = screen.getAllByRole('checkbox');
    // first is "전체 선택", then one per item
    const item1Checkbox = checkboxes[1];
    await user.click(item1Checkbox);

    expect(screen.getByText('₩20,000', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows toast warning when order button clicked with no selection', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1] });

    render(<CartPage />);
    await user.click(screen.getAllByRole('button', { name: '선택 상품 주문하기' })[0]);

    expect(toast.warning).toHaveBeenCalledWith('주문할 상품을 선택해주세요.');
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CartPage from '@/app/[locale]/cart/page';
import type { CartItem } from '@/lib/api';
import { toast } from 'sonner';

vi.mock('next-intl', async () => {
  const { localMessage } = await import('@/utils/localMessages');
  return {
    useLocale: () => 'ko',
    useTranslations: (namespace?: string) => (key: string, values?: Record<string, string | number>) =>
      localMessage(namespace ? namespace + '.' + key : key, values),
  };
});

// ---- next/navigation ----
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ locale: 'ko' }),
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

  it('shows guest cart empty state when not authenticated and no guest items exist', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    mockUseCart.mockReturnValue(defaultCart);

    render(<CartPage />);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it('shows empty cart EmptyState when authenticated but no items', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [] });

    render(<CartPage />);
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it('renders CartItemRow list when items exist', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1, cartItem2] });

    render(<CartPage />);
    expect(screen.getByText('상품 A')).toBeInTheDocument();
    expect(screen.getByText('상품 B')).toBeInTheDocument();
  });

  it('selects every cart item by default', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1, cartItem2] });

    render(<CartPage />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    screen.getAllByRole('checkbox').forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('keeps the remaining guest line selected after the first line is removed', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    mockUseCart.mockReturnValue({
      ...defaultCart,
      items: [{ ...cartItem1, id: -1 }, { ...cartItem2, id: -2 }],
    });

    const { rerender } = render(<CartPage />);
    await user.click(screen.getAllByRole('checkbox')[1]);

    mockUseCart.mockReturnValue({
      ...defaultCart,
      items: [{ ...cartItem2, id: -2 }],
    });
    rerender(<CartPage />);

    expect(screen.getAllByRole('checkbox')[1]).toBeChecked();
  });

  it('places the order summary and brown checkout CTA beside the cart items on desktop', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1] });

    const { container } = render(<CartPage />);

    expect(container.querySelector('aside.checkout-toss-submit-card')).toHaveClass('hidden', 'lg:block');
    expect(container.querySelector('.mobile-sticky-cta')).toHaveClass('lg:hidden');
    expect(container.querySelector('.grid.lg\\:grid-cols-3')).toBeInTheDocument();
    expect(screen.getAllByText("Order Summary")).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: "Order Selected Items" })).toHaveLength(2);
    screen.getAllByRole('button', { name: "Order Selected Items" }).forEach((button) => {
      expect(button).toHaveClass('toss-button--brown');
    });
  });

  it('calculates selected total for checked items', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1, cartItem2] });

    render(<CartPage />);

    const checkboxes = screen.getAllByRole('checkbox');
    // first is "전체 선택", then one per item
    const item2Checkbox = checkboxes[2];
    await user.click(item2Checkbox);

    expect(screen.getAllByText('₩20,000', { selector: 'span' }).length).toBeGreaterThan(0);
  });

  it('shows toast warning when order button clicked with no selection', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1] });

    render(<CartPage />);
    await user.click(screen.getAllByRole('checkbox')[0]);
    await user.click(screen.getAllByRole('button', { name: "Order Selected Items" })[0]);

    expect(toast.warning).toHaveBeenCalledWith("Please select items to order.");
  });

  it('commits selection removal only after the delete succeeds', async () => {
    const user = userEvent.setup();
    const removeItem = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1], removeItem });

    render(<CartPage />);
    await user.click(screen.getAllByRole('button', { name: 'Remove 상품 A' })[0]);

    expect(removeItem).toHaveBeenCalledWith(1);
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked();
  });

  it('restores selection when the delete fails', async () => {
    const user = userEvent.setup();
    const removeItem = vi.fn().mockRejectedValue(new Error('network failure'));
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1], removeItem });

    render(<CartPage />);
    await user.click(screen.getAllByRole('button', { name: 'Remove 상품 A' })[0]);

    await waitFor(() => expect(screen.getAllByRole('checkbox')[1]).toBeChecked());
    expect(removeItem).toHaveBeenCalledWith(1);
  });

  it('preserves an initially unselected row when the delete fails', async () => {
    const user = userEvent.setup();
    const removeItem = vi.fn().mockRejectedValue(new Error('network failure'));
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1], removeItem });

    render(<CartPage />);
    await user.click(screen.getAllByRole('checkbox')[0]);
    await user.click(screen.getAllByRole('button', { name: 'Remove 상품 A' })[0]);

    await waitFor(() => expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked());
  });

  it('supports consecutive successful deletions without stale selection state', async () => {
    const user = userEvent.setup();
    const removeItem = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseCart.mockReturnValue({ ...defaultCart, items: [cartItem1, cartItem2], removeItem });

    render(<CartPage />);
    await user.click(screen.getAllByRole('button', { name: 'Remove 상품 A' })[0]);
    await user.click(screen.getAllByRole('button', { name: 'Remove 상품 B' })[0]);

    expect(removeItem).toHaveBeenNthCalledWith(1, 1);
    expect(removeItem).toHaveBeenNthCalledWith(2, 2);
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked();
    expect(screen.getAllByRole('checkbox')[2]).not.toBeChecked();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OrderCompletePage from '@/app/order/complete/page';
import { ordersApi } from '@/lib/api';

// ---- next/navigation ----
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams('orderId=1&orderNumber=ORD-20260325-ABCDE');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

// ---- next/link ----
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ---- contexts ----
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, token: 'test-token', user: null }),
  AuthContext: {},
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    items: [],
    itemCount: 0,
    totalAmount: 0,
    isLoading: false,
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    refetch: vi.fn(),
  }),
  CartContext: {},
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---- api ----
vi.mock('@/lib/api', () => ({
  ordersApi: { create: vi.fn(), getById: vi.fn() },
  paymentsApi: { prepare: vi.fn(), confirm: vi.fn() },
  cartApi: { getList: vi.fn() },
}));

const sampleOrder = {
  id: 1,
  orderNumber: 'ORD-20260325-ABCDE',
  status: 'paid',
  totalAmount: 40000,
  discountAmount: 0,
  shippingFee: 0,
  recipientName: '홍길동',
  recipientPhone: '010-1234-5678',
  zipcode: '12345',
  address: '서울시 강남구',
  addressDetail: null,
  memo: null,
  items: [
    {
      id: 1,
      productId: 10,
      productOptionId: null,
      productName: '테스트 상품',
      optionName: null,
      price: 20000,
      quantity: 2,
    },
  ],
  createdAt: '2026-03-25T10:00:00.000Z',
};

describe('OrderCompletePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams('orderId=1&orderNumber=ORD-20260325-ABCDE');
  });

  it('redirects to / when no orderId in searchParams', () => {
    mockSearchParams = new URLSearchParams('');
    render(<OrderCompletePage />);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('renders order number text after fetching order', async () => {
    vi.mocked(ordersApi.getById).mockResolvedValue(sampleOrder);

    render(<OrderCompletePage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-20260325-ABCDE')).toBeInTheDocument();
    });

    expect(screen.getByText('주문이 완료되었습니다!')).toBeInTheDocument();
    expect(screen.getByText('테스트 상품')).toBeInTheDocument();
  });

  it('renders "쇼핑 계속하기" link pointing to /', async () => {
    vi.mocked(ordersApi.getById).mockResolvedValue(sampleOrder);

    render(<OrderCompletePage />);

    await waitFor(() => {
      expect(screen.getByText('쇼핑 계속하기')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: '쇼핑 계속하기' });
    expect(link).toHaveAttribute('href', '/');
  });
});

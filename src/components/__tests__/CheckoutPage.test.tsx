import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckoutPage from '@/app/[locale]/checkout/page';
import { ordersApi, paymentsApi, usersApi } from '@/lib/api';
import type { CartItem, UserAddress } from '@/lib/api';

const makeParams = () => Promise.resolve({ locale: 'ko' as const });

// ---- next/navigation ----
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
}));

// ---- sonner ----
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

// ---- contexts ----
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthContext: {},
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    items: [], itemCount: 0, totalAmount: 0, isLoading: false,
    addItem: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn(), refetch: vi.fn(),
  }),
  CartContext: {},
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---- i18n/routing ----
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['ko', 'en', 'ja', 'zh'], defaultLocale: 'ko' },
}));

// ---- PaymentGateway ----
vi.mock('@/components/checkout/PaymentGateway', () => ({
  default: () => <div data-testid="payment-gateway">PaymentGateway</div>,
}));

// ---- api ----
vi.mock('@/lib/api', () => ({
  ordersApi: { create: vi.fn(), getById: vi.fn() },
  paymentsApi: { prepare: vi.fn(), confirm: vi.fn() },
  cartApi: { getList: vi.fn() },
  usersApi: { getAddresses: vi.fn().mockResolvedValue([]), updateAddress: vi.fn().mockResolvedValue({}) },
}));

const sampleItem: CartItem = {
  id: 1, productId: 10, productOptionId: null, quantity: 2,
  unitPrice: 20000, subtotal: 40000,
  product: { id: 10, name: '테스트 상품', slug: 'test-product', price: 20000, salePrice: null, status: 'active', images: [] },
  option: null,
};

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('redirects to /login when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, token: null, user: null, isLoading: false });
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });
    expect(mockReplace).toHaveBeenCalledWith('/ko/login');
  });

  it('redirects to /cart when no sessionStorage items', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });
    expect(mockReplace).toHaveBeenCalledWith('/ko/cart');
  });

  it('renders form fields and order summary with valid items', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });
    expect(await screen.findByLabelText(/받는 분 이름/)).toBeInTheDocument();
    expect(screen.getByLabelText(/연락처/)).toBeInTheDocument();
    expect(screen.getByText('테스트 상품')).toBeInTheDocument();
  });

  it('shows validation error for invalid phone on submit', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });
    await screen.findByLabelText(/받는 분 이름/);
    await user.type(screen.getByLabelText(/받는 분 이름/), '홍길동');
    await user.type(screen.getByLabelText(/연락처/), '01012345678');
    await user.type(screen.getByLabelText(/우편번호/), '12345');
    await user.type(screen.getByLabelText(/^주소/), '서울시 강남구');
    await user.click(screen.getByRole('button', { name: '결제하기' }));
    expect(screen.getByText('올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)')).toBeInTheDocument();
    expect(ordersApi.create).not.toHaveBeenCalled();
  });

  it('calls ordersApi.create + paymentsApi.prepare + confirm on success', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));

    vi.mocked(ordersApi.create).mockResolvedValue({
      id: 1, orderNumber: 'ORD-001', status: 'pending', totalAmount: 40000,
      discountAmount: 0, shippingFee: 0, recipientName: '홍길동',
      recipientPhone: '010-1234-5678', zipcode: '12345', address: '서울시',
      addressDetail: null, memo: null, items: [], createdAt: new Date().toISOString(),
    });
    vi.mocked(paymentsApi.prepare).mockResolvedValue({
      paymentId: 1, orderId: 1, orderNumber: 'ORD-001',
      amount: 40000, gateway: 'mock', clientKey: 'mock_client_key',
    });
    vi.mocked(paymentsApi.confirm).mockResolvedValue({
      paymentId: 1, orderId: 1, orderNumber: 'ORD-001',
      status: 'paid', method: 'card', amount: 40000, paidAt: new Date().toISOString(),
    });

    await act(async () => { render(<CheckoutPage params={makeParams()} />) });
    await screen.findByLabelText(/받는 분 이름/);
    await user.type(screen.getByLabelText(/받는 분 이름/), '홍길동');
    await user.type(screen.getByLabelText(/연락처/), '010-1234-5678');
    await user.type(screen.getByLabelText(/우편번호/), '12345');
    await user.type(screen.getByLabelText(/^주소/), '서울시 강남구');
    await user.click(screen.getByRole('button', { name: '결제하기' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/ko/order/complete?orderId=1&orderNumber=ORD-001');
    });
    expect(ordersApi.create).toHaveBeenCalledOnce();
    expect(paymentsApi.prepare).toHaveBeenCalledOnce();
    expect(paymentsApi.confirm).toHaveBeenCalledOnce();
  });

  // ---- Address loading & selection tests ----

  const defaultAddress: UserAddress = {
    id: 1,
    userId: 1,
    recipientName: '김기본',
    phone: '010-1111-2222',
    zipcode: '06000',
    address: '서울특별시 강남구 역삼동',
    addressDetail: '101호',
    label: '집',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const secondAddress: UserAddress = {
    id: 2,
    userId: 1,
    recipientName: '이직장',
    phone: '010-3333-4444',
    zipcode: '04000',
    address: '서울특별시 중구 을지로',
    addressDetail: '5층',
    label: '회사',
    isDefault: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  };

  it('shows loading indicator while fetching addresses', async () => {
    let resolveAddresses!: (value: UserAddress[]) => void;
    vi.mocked(usersApi.getAddresses).mockReturnValue(
      new Promise((resolve) => { resolveAddresses = resolve; }),
    );
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });

    expect(await screen.findByText('주소 불러오는 중...')).toBeInTheDocument();

    resolveAddresses([]);
    await waitFor(() => {
      expect(screen.queryByText('주소 불러오는 중...')).not.toBeInTheDocument();
    });
  });

  it('fetches saved addresses on mount and auto-fills default address', async () => {
    vi.mocked(usersApi.getAddresses).mockResolvedValue([defaultAddress, secondAddress]);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });

    await waitFor(() => {
      expect(screen.getByLabelText(/받는 분 이름/)).toHaveValue('김기본');
    });
    expect(screen.getByLabelText(/연락처/)).toHaveValue('010-1111-2222');
    expect(screen.getByLabelText(/우편번호/)).toHaveValue('06000');
    expect(screen.getByLabelText(/^주소/)).toHaveValue('서울특별시 강남구 역삼동');
    expect(screen.getByLabelText(/상세 주소/)).toHaveValue('101호');
  });

  it('shows address selection list when multiple addresses exist', async () => {
    vi.mocked(usersApi.getAddresses).mockResolvedValue([defaultAddress, secondAddress]);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });

    await waitFor(() => {
      expect(screen.getByLabelText(/집/)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/회사/)).toBeInTheDocument();
    expect(screen.getByLabelText(/직접 입력/)).toBeInTheDocument();
  });

  it('selecting a different address fills the form', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.getAddresses).mockResolvedValue([defaultAddress, secondAddress]);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });

    await waitFor(() => {
      expect(screen.getByLabelText(/회사/)).toBeInTheDocument();
    });
    await user.click(screen.getByLabelText(/회사/));

    await waitFor(() => {
      expect(screen.getByLabelText(/받는 분 이름/)).toHaveValue('이직장');
    });
    expect(screen.getByLabelText(/연락처/)).toHaveValue('010-3333-4444');
    expect(screen.getByLabelText(/우편번호/)).toHaveValue('04000');
    expect(screen.getByLabelText(/^주소/)).toHaveValue('서울특별시 중구 을지로');
    expect(screen.getByLabelText(/상세 주소/)).toHaveValue('5층');
  });

  it('selecting direct input clears the form', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.getAddresses).mockResolvedValue([defaultAddress, secondAddress]);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });

    await waitFor(() => {
      expect(screen.getByLabelText(/받는 분 이름/)).toHaveValue('김기본');
    });
    await user.click(screen.getByLabelText(/직접 입력/));

    await waitFor(() => {
      expect(screen.getByLabelText(/받는 분 이름/)).toHaveValue('');
    });
    expect(screen.getByLabelText(/연락처/)).toHaveValue('');
    expect(screen.getByLabelText(/우편번호/)).toHaveValue('');
    expect(screen.getByLabelText(/^주소/)).toHaveValue('');
    expect(screen.getByLabelText(/상세 주소/)).toHaveValue('');
  });

  it('shows add address button when no saved addresses exist', async () => {
    vi.mocked(usersApi.getAddresses).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });

    await waitFor(() => {
      expect(screen.getByText('저장된 배송지가 없습니다.')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '배송지 추가' })).toBeInTheDocument();
  });

  it('handles address fetch error gracefully', async () => {
    const { toast } = await import('sonner');
    vi.mocked(usersApi.getAddresses).mockRejectedValue(new Error('Network error'));
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await act(async () => { render(<CheckoutPage params={makeParams()} />) });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    // Form should remain empty for manual entry
    expect(screen.getByLabelText(/받는 분 이름/)).toHaveValue('');
  });
});

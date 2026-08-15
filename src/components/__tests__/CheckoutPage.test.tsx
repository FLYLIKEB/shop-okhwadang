import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forwardRef, Suspense, useImperativeHandle } from 'react';
import CheckoutPage from '@/app/[locale]/checkout/page';
import { ordersApi, paymentsApi, usersApi } from '@/lib/api';
import { checkoutPricingApi } from '@/lib/api/checkout-pricing';
import type { CartItem, UserAddress } from '@/lib/api';

const makeParams = () => Promise.resolve({ locale: 'ko' as const });
const mockPaymentGatewayConfirm = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      title: '주문 / 결제',
      shippingInfo: '배송 정보',
      loadingAddresses: '주소 불러오는 중...',
      noSavedAddress: '저장된 배송지가 없습니다.',
      addAddress: '배송지 추가',
      manualEntry: '직접 입력',
      recipientName: '받는 분 이름',
      phone: '연락처',
      zipcode: '우편번호',
      address: '주소',
      addressDetail: '상세 주소',
      shippingMemo: '배송 메모',
      paymentMethod: '결제 수단',
      tossPayment: '토스페이먼츠',
      paypalPayment: 'PayPal',
      naverpayPayment: '네이버페이',
      bankTransferPayment: '무통장입금',
      bankTransferAccountTitle: '입금 계좌',
      bankTransferBankLabel: '은행',
      bankTransferBankName: '국민은행',
      bankTransferAccountLabel: '계좌번호',
      bankTransferAccountNumber: '123456-78-901234',
      bankTransferHolderLabel: '예금주',
      bankTransferAccountHolder: '옥화당',
      bankTransferAccountNote: '주문 접수 후 위 계좌로 입금해 주세요. 입금 확인 후 상품 준비가 시작됩니다.',
      eximbayPayment: 'Credit card',
      eximbayHostedPaymentHint: '카드 정보는 Eximbay 보안 결제창에서 입력됩니다.',
      cardPaymentTitle: 'Payment',
      cardPaymentSubtitle: '카드 정보는 결제사의 보안 결제창에서 입력됩니다.',
      creditCardTitle: 'Credit card',
      cardBrandsLabel: '지원 카드 브랜드',
      cardNumberLabel: '카드 번호',
      cardNumberPlaceholder: 'Card number',
      cardExpiryLabel: '유효기간',
      cardExpiryPlaceholder: 'MM / YY',
      cardCvcLabel: '보안코드',
      cardCvcPlaceholder: 'Security code',
      cardHolderLabel: '카드소유자명',
      cardHolderPlaceholder: 'Name on card',
      billingSameAsShipping: 'Use shipping address as billing address',
      cardTermsAriaLabel: '카드 결제 약관 동의',
      cardTermsAgreement: 'I agree to the payment terms and authorize the secure card payment.',
      payNow: 'Pay now',
      cardSecurePageNotice: '카드번호·유효기간·CVC는 저장되지 않습니다.',
      paypalRedirectHint: 'PayPal',
      couponPoints: '쿠폰 / 적립금',
      orderItems: '주문 상품',
      productAmount: '상품 금액',
      shippingFee: '배송비',
      discountAmount: '할인 금액',
      pointsUsed: '사용 적립금',
      total: '합계',
      pay: '결제하기',
      loadAddressError: '저장된 주소를 불러오는데 실패했습니다.',
      freeShipping: '무료',
      freeShippingUnlocked: '무료배송이 적용되었습니다.',
      freeShippingRemaining: '무료배송 임계',
      pricingPreviewError: '주문 금액을 다시 계산하지 못했습니다.',
      'flow.shipping': '배송 정보',
      'flow.payment': '결제 수단',
      'flow.complete': '결제 완료',
      'steps.idle': '결제하기',
      'steps.creating_order': '주문 생성 중...',
      'steps.preparing_payment': '결제 준비 중...',
      'steps.confirming_payment': '결제 확인 중...',
      'steps.success': '완료',
      'consent.title': '필수 동의',
      'consent.requiredLabel': '[필수] 구매조건 및 개인정보 처리에 동의합니다.',
      'consent.requiredDescription': '주문할 상품의 상품명, 가격, 배송정보, 교환·환불 규정을 확인했으며 구매에 동의합니다.',
      'consent.marketingLabel': '[선택] 마케팅 정보 수신에 동의합니다.',
      'consent.marketingDescription': '신상품, 프로모션, 이벤트 안내를 받을 수 있습니다.',
      guestCheckoutTitle: '비회원 주문',
      guestCheckoutDescription: '비회원 안내',
      guestEmailLabel: '비회원 이메일',
      guestEmailPlaceholder: 'you@example.com',
      guestEmailDescription: '주문 안내와 비회원 주문조회에 사용할 이메일입니다.',
    };
    return dict[key] ?? key;
  },
}));

const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockRouter = { replace: mockReplace, push: mockPush };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/ko/checkout',
  redirect: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

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

vi.mock('@/contexts/MobileNavContext', () => ({
  useMobileNav: () => ({ isVisible: false }),
}));

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['ko', 'en'], defaultLocale: 'ko' },
}));

vi.mock('@/components/shared/checkout/PaymentGateway', () => ({
  default: forwardRef(function MockPaymentGateway(_props: unknown, ref) {
    useImperativeHandle(ref, () => ({ confirm: mockPaymentGatewayConfirm }));
    return <div data-testid="payment-gateway">PaymentGateway</div>;
  }),
  TossPaymentWidgetPreview: () => (
    <div data-testid="toss-widget-preview">TossPaymentWidgetPreview</div>
  ),
}));

vi.mock('@/components/shared/checkout/CouponSelector', () => ({
  default: ({ onSelectionChange }: { onSelectionChange: (userCouponId?: number, pointsToUse?: number) => void }) => (
    <div>
      <button type="button" onClick={() => onSelectionChange(7, 2000)}>
        혜택 적용
      </button>
    </div>
  ),
}));

vi.mock('@/lib/api', () => ({
  ordersApi: { create: vi.fn(), getById: vi.fn() },
  guestOrdersApi: { create: vi.fn(), getById: vi.fn(), lookup: vi.fn() },
  paymentsApi: { prepare: vi.fn(), confirm: vi.fn() },
  guestPaymentsApi: { prepare: vi.fn(), confirm: vi.fn() },
  cartApi: { getList: vi.fn() },
  usersApi: { getAddresses: vi.fn().mockResolvedValue([]), updateAddress: vi.fn().mockResolvedValue({}) },
}));

vi.mock('@/lib/api/checkout-pricing', () => ({
  checkoutPricingApi: {
    preview: vi.fn(),
  },
}));

const sampleItem: CartItem = {
  id: 1, productId: 10, productOptionId: null, quantity: 2,
  unitPrice: 20000, subtotal: 40000,
  product: { id: 10, name: '테스트 상품', slug: 'test-product', price: 20000, salePrice: null, status: 'active', images: [] },
  option: null,
};

const defaultPreview = {
  subtotalAmount: 40000,
  couponDiscount: 0,
  pointsDiscount: 0,
  shippingFee: 0,
  isFreeShipping: true,
  isRemoteArea: false,
  remoteAreaSurcharge: 0,
  totalPayable: 40000,
  appliedPointsUsed: 0,
  freeShippingThreshold: 50000,
};

async function renderCheckoutPage() {
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <CheckoutPage params={makeParams()} />
      </Suspense>,
    );
  });
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS = 'toss,paypal,eximbay';
    vi.mocked(checkoutPricingApi.preview).mockResolvedValue(defaultPreview);
  });

  it('renders guest checkout without redirect when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, token: null, user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await renderCheckoutPage();
    expect(mockReplace).not.toHaveBeenCalledWith('/ko/login');
    expect(await screen.findByLabelText(/비회원 이메일/)).toBeInTheDocument();
    expect(screen.queryByText('쿠폰 / 적립금')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(checkoutPricingApi.preview).toHaveBeenCalledWith({
        items: [{ productId: 10, productOptionId: null, quantity: 2 }],
        zipcode: '00000',
        userCouponId: undefined,
        pointsToUse: undefined,
        locale: 'ko',
      });
    });
  });

  it('redirects to /cart when no sessionStorage items', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    await renderCheckoutPage();
    expect(mockReplace).toHaveBeenCalledWith('/ko/cart');
  });

  it('renders form fields and order summary with valid items', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await renderCheckoutPage();
    expect(await screen.findByLabelText(/받는 분 이름/)).toBeInTheDocument();
    expect(screen.getByLabelText(/연락처/)).toBeInTheDocument();
    expect(screen.getByText('테스트 상품')).toBeInTheDocument();
  });

  it('uses preview totals and keeps coupon discount / points / shipping split visible', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    vi.mocked(checkoutPricingApi.preview)
      .mockResolvedValueOnce(defaultPreview)
      .mockResolvedValueOnce({
        ...defaultPreview,
        couponDiscount: 5000,
        pointsDiscount: 2000,
        shippingFee: 3000,
        totalPayable: 36000,
        appliedUserCouponId: 7,
        appliedPointsUsed: 2000,
      });

    await renderCheckoutPage();
    await screen.findByText('테스트 상품');
    await user.click(screen.getByRole('button', { name: '혜택 적용' }));

    await waitFor(() => {
      expect(checkoutPricingApi.preview).toHaveBeenLastCalledWith({
        items: [{ productId: 10, productOptionId: null, quantity: 2 }],
        zipcode: '00000',
        userCouponId: 7,
        pointsToUse: 2000,
        locale: 'ko',
      });
    });

    expect(await screen.findByText(/-₩5,000/)).toBeInTheDocument();
    expect(screen.getByText('사용 적립금')).toBeInTheDocument();
    expect(screen.getByText(/-₩2,000/)).toBeInTheDocument();
    expect(screen.getAllByText(/₩36,000/)[0]).toBeInTheDocument();
  });

  it('keeps desktop order summary and submit CTA inside the same sticky aside', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));

    await renderCheckoutPage();

    const orderSummaryHeading = await screen.findByText('주문 상품');
    const desktopSummaryAside = orderSummaryHeading.closest('aside');

    expect(desktopSummaryAside).not.toBeNull();
    expect(desktopSummaryAside).toHaveClass('lg:sticky', 'lg:top-24', 'lg:self-start');
    expect(desktopSummaryAside).toContainElement(screen.getByText('테스트 상품'));
    expect(desktopSummaryAside).toContainElement(screen.getAllByRole('button', { name: '결제하기' })[0]);
  });

  it('shows validation error for invalid phone on submit', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await renderCheckoutPage();
    await screen.findByLabelText(/받는 분 이름/);
    fireEvent.change(screen.getByLabelText(/받는 분 이름/), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByLabelText(/연락처/), { target: { value: '01012345678' } });
    fireEvent.change(screen.getByLabelText(/우편번호/), { target: { value: '12345' } });
    fireEvent.change(screen.getByLabelText(/^주소/), { target: { value: '서울시 강남구' } });
    await user.click(screen.getByLabelText(/구매조건 및 개인정보 처리/));
    await user.click(screen.getAllByRole('button', { name: '결제하기' })[0]);

    await waitFor(() => {
      expect(ordersApi.create).not.toHaveBeenCalled();
      expect(paymentsApi.prepare).not.toHaveBeenCalled();
    });
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
      amount: 40000, gateway: 'mock', clientKey: 'mock_client_key', availableGateways: ['naverpay', 'eximbay', 'paypal'],
    });
    vi.mocked(paymentsApi.confirm).mockResolvedValue({
      paymentId: 1, orderId: 1, orderNumber: 'ORD-001',
      status: 'paid', method: 'card', amount: 40000, paidAt: new Date().toISOString(),
    });

    await renderCheckoutPage();
    await screen.findByLabelText(/받는 분 이름/);
    await user.type(screen.getByLabelText(/받는 분 이름/), '홍길동');
    await user.type(screen.getByLabelText(/연락처/), '010-1234-5678');
    await user.type(screen.getByLabelText(/우편번호/), '12345');
    await user.type(screen.getByLabelText(/^주소/), '서울시 강남구');
    await user.click(screen.getByLabelText(/구매조건 및 개인정보 처리/));
    await user.click(screen.getAllByRole('button', { name: '결제하기' })[0]);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/ko/order/complete?orderId=1&orderNumber=ORD-001');
    });
    expect(ordersApi.create).toHaveBeenCalledOnce();
    expect(paymentsApi.prepare).toHaveBeenCalledOnce();
    expect(paymentsApi.confirm).toHaveBeenCalledOnce();
  });

  it('ko checkout은 주문 생성 전부터 토스 위젯을 노출한다', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));

    await renderCheckoutPage();

    expect(await screen.findByTestId('toss-widget-preview')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /토스페이먼츠/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /네이버페이/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /PayPal/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Credit card/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('secure-card-entry-shell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bank-transfer-account-info')).not.toBeInTheDocument();
  });

  it('ko checkout은 prepare gateway=toss를 전달한다', async () => {
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
      amount: 40000, gateway: 'toss', clientKey: 'toss-widget-client',
      gatewayPayload: { customerKey: 'member-customer-key' },
      availableGateways: ['toss'],
    });

    await renderCheckoutPage();
    expect(await screen.findByTestId('toss-widget-preview')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/받는 분 이름/), '홍길동');
    await user.type(screen.getByLabelText(/연락처/), '010-1234-5678');
    await user.type(screen.getByLabelText(/우편번호/), '12345');
    await user.type(screen.getByLabelText(/^주소/), '서울시 강남구');
    await user.click(screen.getByLabelText(/구매조건 및 개인정보 처리/));
    await user.click(screen.getAllByRole('button', { name: '결제하기' })[0]);

    await waitFor(() => {
      expect(paymentsApi.prepare).toHaveBeenCalledWith({ orderId: 1, locale: 'ko', gateway: 'toss' });
      expect(screen.getByTestId('payment-gateway')).toBeInTheDocument();
    });
    expect(mockPaymentGatewayConfirm).not.toHaveBeenCalled();
  });

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
    await renderCheckoutPage();

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
    await renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/받는 분 이름/)).toHaveValue('김기본');
    });
    expect(screen.getByLabelText(/연락처/)).toHaveValue('010-1111-2222');
    expect(screen.getByLabelText(/우편번호/)).toHaveValue('06000');
    expect(screen.getByLabelText(/^주소/)).toHaveValue('서울특별시 강남구 역삼동');
    expect(screen.getByLabelText(/상세 주소/)).toHaveValue('101호');
  });

  it('숫자형 zipcode 주소도 문자열로 정규화해 폼에 채운다', async () => {
    vi.mocked(usersApi.getAddresses).mockResolvedValue([
      { ...defaultAddress, zipcode: 6000 as unknown as string } as UserAddress,
    ]);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await renderCheckoutPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/우편번호/)).toHaveValue('06000');
    });
  });

  it('shows address selection list when multiple addresses exist', async () => {
    vi.mocked(usersApi.getAddresses).mockResolvedValue([defaultAddress, secondAddress]);
    mockUseAuth.mockReturnValue({ isAuthenticated: true, token: 'tok', user: null, isLoading: false });
    sessionStorage.setItem('checkoutItems', JSON.stringify([sampleItem]));
    await renderCheckoutPage();

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
    await renderCheckoutPage();

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
    await renderCheckoutPage();

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
    await renderCheckoutPage();

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
    await renderCheckoutPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(screen.getByLabelText(/받는 분 이름/)).toHaveValue('');
  });
});

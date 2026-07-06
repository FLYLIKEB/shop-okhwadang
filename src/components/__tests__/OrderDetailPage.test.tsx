import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { forwardRef, useImperativeHandle } from 'react';
import OrderDetailPage from '@/app/[locale]/my/orders/[id]/page';
import { ordersApi, paymentsApi } from '@/lib/api';
import type { OrderResponse } from '@/lib/api';

function makeTranslator(namespace?: string) {
  const dict: Record<string, string> = {
    title: '마이페이지',
    orderHistory: '주문 내역',
    shippingStatus: '주문 상태',
    orderItems: '주문 상품',
    paymentSummary: '결제 금액',
    productAmount: '상품 금액',
    discountAmount: '할인 금액',
    shippingFee: '배송비',
    total: '합계',
    shippingAddress: '배송지',
    recipient: '받는 분',
    phone: '연락처',
    address: '주소',
    deliveryMemo: '배송 메모',
    freeShipping: '무료',
    notFound: '주문을 찾을 수 없습니다.',
    backToOrders: '주문 목록으로',
    paymentMethod: '결제 수단',
    taxReceiptGuideTitle: '현금영수증/세금계산서 안내',
    taxReceiptGuideDescription: '현금영수증 또는 세금계산서가 필요하시면 주문번호를 포함해 고객센터로 요청해 주세요.',
    taxReceiptPersonal: '개인소득공제와 사업자지출증빙은 결제수단 정책에 따라 처리 범위가 달라질 수 있습니다.',
    taxInvoiceBusiness: '세금계산서는 사업자등록번호와 담당자 연락처를 함께 전달해 주세요.',
    paymentMethodHint: '주문 정보 입력 후 결제 수단이 표시됩니다.',
    paypalPayment: 'PayPal',
    naverpayPayment: '네이버페이',
    naverpayDomesticBadge: '국내 전용',
    naverpayDomesticHint: '해외 사용자는 결제가 실패할 수 있습니다.',
    eximbayPayment: '카드 결제 (Visa/Master/JCB/Amex)',
    eximbayHostedPaymentHint: '카드 정보는 Eximbay 보안 결제창에서 입력됩니다.',
    cardPaymentTitle: 'Payment',
    cardPaymentSubtitle: '일반 해외 커머스 방식의 카드 결제 화면입니다.',
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
    paypalRedirectHint: 'PayPal 승인 페이지로 이동합니다.',
    'steps.idle': '결제하기',
    'steps.creating_order': '주문 생성 중...',
    'steps.preparing_payment': '결제 준비 중...',
    'steps.confirming_payment': '결제 확인 중...',
    'steps.success': '완료',
    'status.pending': '결제대기',
    'status.paid': '결제완료',
    'status.preparing': '상품준비',
    'status.shipped': '배송중',
    'status.delivered': '배송완료',
  };
  const fn = ((key: string, vars?: Record<string, unknown>) => {
    if (key === 'quantity') return `${vars?.count ?? 0}개`;
    return dict[key] ?? `${namespace ? `${namespace}.` : ''}${key}`;
  }) as ((key: string, vars?: Record<string, unknown>) => string) & { has: (key: string) => boolean };
  fn.has = (key: string) => key in dict;
  return fn;
}

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: (namespace?: string) => makeTranslator(namespace),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '16' }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock('@/components/shared/hooks/useRequireAuth', () => ({
  useRequireAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));

vi.mock('@/contexts/GlobalLoadingContext', () => ({
  useGlobalLoading: () => ({ startLoading: vi.fn(), stopLoading: vi.fn() }),
}));

vi.mock('@/components/shared/ShippingTimeline', () => ({
  default: ({ orderId }: { orderId: number }) => <div data-testid="shipping-timeline">shipping {orderId}</div>,
}));

vi.mock('@/components/shared/checkout/PaymentGateway', () => ({
  default: forwardRef(function MockPaymentGateway(_props: unknown, ref) {
    useImperativeHandle(ref, () => ({ confirm: vi.fn() }));
    return <div data-testid="payment-gateway">PaymentGateway</div>;
  }),
}));

vi.mock('@/lib/api', () => ({
  ordersApi: { getById: vi.fn() },
  paymentsApi: { prepare: vi.fn() },
}));

const pendingOrder: OrderResponse = {
  id: 16,
  orderNumber: 'ORD-16',
  status: 'pending',
  totalAmount: 30000,
  discountAmount: 0,
  shippingFee: 0,
  recipientName: '홍길동',
  recipientPhone: '010-1234-5678',
  zipcode: '06000',
  address: '서울시 강남구',
  addressDetail: null,
  memo: null,
  createdAt: '2026-06-04T00:00:00.000Z',
  items: [
    { id: 1, productId: 1, productOptionId: null, productName: '찻잔', optionName: null, price: 30000, quantity: 1 },
  ],
};

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ordersApi.getById).mockResolvedValue(pendingOrder);
  });

  it('결제대기 주문에서는 배송 추적을 숨기고 결제 수단 선택을 노출한다', async () => {
    render(<OrderDetailPage />);

    expect(await screen.findByText('ORD-16')).toBeInTheDocument();
    expect(screen.queryByTestId('shipping-timeline')).toBeNull();
    expect(screen.getByLabelText(/Credit card/)).toBeChecked();
    expect(screen.getByPlaceholderText('Card number')).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/네이버페이/)).toBeInTheDocument();
    expect(screen.getByLabelText(/PayPal/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결제하기' })).toBeInTheDocument();
    expect(screen.getByText('현금영수증/세금계산서 안내')).toBeInTheDocument();
    expect(screen.getByText(/주문번호를 포함해 고객센터로 요청/)).toBeInTheDocument();
  });

  it('결제대기 주문에서 PayPal 선택 후 결제 준비 API를 호출하고 동일 PaymentGateway 컴포넌트로 전환한다', async () => {
    const user = userEvent.setup();
    vi.mocked(paymentsApi.prepare).mockResolvedValue({
      paymentId: 10,
      orderId: 16,
      orderNumber: 'ORD-16',
      amount: 30000,
      gateway: 'paypal',
      clientKey: 'paypal-client',
      redirectUrl: 'https://www.paypal.com/checkoutnow?token=PAYPAL-16',
      availableGateways: ['naverpay', 'eximbay', 'paypal'],
    });

    render(<OrderDetailPage />);

    await screen.findByText('ORD-16');
    await user.click(screen.getByLabelText(/PayPal/));
    await user.click(screen.getByRole('button', { name: '결제하기' }));

    await waitFor(() => {
      expect(paymentsApi.prepare).toHaveBeenCalledWith({ orderId: 16, locale: 'ko', gateway: 'paypal' });
    });
    expect(await screen.findByTestId('payment-gateway')).toBeInTheDocument();
  });
});

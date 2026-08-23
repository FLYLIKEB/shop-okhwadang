import { render, screen, waitFor, within } from '@testing-library/react';
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
    couponDiscount: '쿠폰 할인',
    pointsUsed: '적립금 할인',
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
    'serviceRequests.title': '취소/교환/반품/환불 신청',
    'serviceRequests.pendingCancelGuide': '결제대기 상태에서는 관리자 승인 없이 바로 주문을 취소할 수 있습니다.',
    'serviceRequests.cancelGuide': '결제대기/결제완료 상태에서는 주문 취소를 신청할 수 있습니다.',
    'serviceRequests.afterDeliveryGuide': '배송 완료 후 반품/교환/환불 신청을 접수할 수 있습니다.',
    'serviceRequests.unavailableGuide': '현재 주문 상태에서는 온라인 신청이 제한됩니다.',
    'serviceRequests.typeLabel': '신청 유형',
    'serviceRequests.reasonLabel': '사유',
    'serviceRequests.reasonPlaceholder': '취소 사유를 입력하세요.',
    'serviceRequests.detailLabel': '상세 내용',
    'serviceRequests.detailPlaceholder': '상세 내용을 입력하세요.',
    'serviceRequests.submit': '신청 접수',
    'serviceRequests.immediateCancelSubmit': '주문 바로 취소',
    'serviceRequests.submitSuccess': '신청이 접수되었습니다.',
    'serviceRequests.immediateCancelSuccess': '주문이 취소되었습니다.',
    'serviceRequests.submitError': '신청에 실패했습니다.',
    'serviceRequests.reasonRequired': '사유를 입력해주세요.',
    'serviceRequests.types.cancel': '주문 취소',
    'serviceRequests.types.return': '반품',
    'serviceRequests.types.exchange': '교환',
    'serviceRequests.types.refund': '환불',
    'serviceRequests.status.requested': '접수',
    'serviceRequests.status.approved': '승인',
    'serviceRequests.status.rejected': '반려',
    'serviceRequests.status.completed': '처리 완료',
    paypalPayment: 'PayPal',
    tossPayment: '토스페이먼츠',
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
  ordersApi: { getById: vi.fn(), getServiceRequests: vi.fn(), createServiceRequest: vi.fn() },
  paymentsApi: { prepare: vi.fn() },
}));

const pendingOrder: OrderResponse = {
  id: 16,
  orderNumber: 'ORD-16',
  status: 'pending',
  totalAmount: 30000,
  discountAmount: 0,
  pointsUsed: 0,
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
    process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS = 'toss,paypal,eximbay';
    vi.mocked(ordersApi.getById).mockResolvedValue(pendingOrder);
    vi.mocked(ordersApi.getServiceRequests).mockResolvedValue([]);
    vi.mocked(ordersApi.createServiceRequest).mockResolvedValue({
      id: 1,
      orderId: 16,
      userId: 10,
      type: 'cancel',
      status: 'completed',
      reason: '단순 변심',
      detail: null,
      imageUrls: null,
      useShippingAddress: true,
      pickupName: null,
      pickupPhone: null,
      pickupZipcode: null,
      pickupAddress: null,
      pickupAddressDetail: null,
      adminNote: null,
      processedAt: '2026-07-07T00:00:00.000Z',
      createdAt: '2026-07-07T00:00:00.000Z',
    });
  });

  it('결제대기 주문에서는 배송 추적을 숨기고 결제 수단 선택을 노출한다', async () => {
    render(<OrderDetailPage />);

    expect(await screen.findByText('ORD-16')).toBeInTheDocument();
    expect(screen.queryByTestId('shipping-timeline')).toBeNull();
    expect(screen.getByRole('radio', { name: /토스페이먼츠/ })).toBeChecked();
    expect(screen.queryByPlaceholderText('Card number')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /무통장입금/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Credit card/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /PayPal/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결제하기' })).toBeInTheDocument();
    expect(screen.getByText('현금영수증/세금계산서 안내')).toBeInTheDocument();
    expect(screen.getByText(/주문번호를 포함해 고객센터로 요청/)).toBeInTheDocument();
  }, 20000);

  it.each([
    { name: '쿠폰만', discountAmount: 3000, pointsUsed: 0, shippingFee: 3000, totalAmount: 28000 },
    { name: '적립금만', discountAmount: 0, pointsUsed: 2000, shippingFee: 3000, totalAmount: 29000 },
    { name: '쿠폰과 적립금 및 배송비', discountAmount: 3000, pointsUsed: 2000, shippingFee: 3000, totalAmount: 26000 },
  ])('$name 조합은 서버 금액을 분리해 표시한다', async ({ discountAmount, pointsUsed, shippingFee, totalAmount }) => {
    const order = {
      ...pendingOrder,
      status: 'delivered',
      totalAmount,
      discountAmount,
      pointsUsed,
      shippingFee,
      items: [
        { ...pendingOrder.items[0], price: 12000, quantity: 1 },
        { ...pendingOrder.items[0], id: 2, price: 8000, quantity: 2 },
      ],
    };
    vi.mocked(ordersApi.getById).mockResolvedValue(order);

    render(<OrderDetailPage />);

    const heading = await screen.findByText('결제 금액');
    const summary = heading.closest('section');
    if (!summary) throw new Error('payment summary section not found');
    expect(within(summary).getAllByText('₩28,000')).toHaveLength(totalAmount === 28000 ? 2 : 1);
    expect(within(summary).getByText(`-₩${discountAmount.toLocaleString('ko-KR')}`)).toBeInTheDocument();
    expect(within(summary).getByText(`-₩${pointsUsed.toLocaleString('ko-KR')}`)).toBeInTheDocument();
    expect(within(summary).getByText(`₩${shippingFee.toLocaleString('ko-KR')}`)).toBeInTheDocument();
    expect(within(summary).getAllByText(`₩${totalAmount.toLocaleString('ko-KR')}`)).toHaveLength(totalAmount === 28000 ? 2 : 1);
  });


  it('결제대기 주문에서 주문 바로 취소 신청을 즉시 완료 API로 접수한다', async () => {
    const user = userEvent.setup();

    render(<OrderDetailPage />);

    expect(await screen.findByText('ORD-16')).toBeInTheDocument();
    expect(screen.getByText('결제대기 상태에서는 관리자 승인 없이 바로 주문을 취소할 수 있습니다.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('취소 사유를 입력하세요.'), '단순 변심');
    await user.click(screen.getByRole('button', { name: '주문 바로 취소' }));

    await waitFor(() => {
      expect(ordersApi.createServiceRequest).toHaveBeenCalledWith(16, {
        type: 'cancel',
        reason: '단순 변심',
        detail: undefined,
        useShippingAddress: true,
      });
    });
    expect(ordersApi.getServiceRequests).toHaveBeenCalledWith(16);
    expect(ordersApi.getById).toHaveBeenCalledTimes(2);
  }, 20000);


  it('결제대기 주문에서 Toss 결제 준비 API를 호출하고 PaymentGateway로 전환한다', async () => {
    const user = userEvent.setup();
    vi.mocked(paymentsApi.prepare).mockResolvedValue({
      paymentId: 10,
      orderId: 16,
      orderNumber: 'ORD-16',
      amount: 30000,
      gateway: 'toss',
      clientKey: 'toss-widget-client',
      gatewayPayload: { customerKey: 'member-customer-key' },
      availableGateways: ['toss'],
    });

    render(<OrderDetailPage />);

    await screen.findByText('ORD-16');
    await user.click(screen.getByRole('button', { name: '결제하기' }));

    await waitFor(() => {
      expect(paymentsApi.prepare).toHaveBeenCalledWith(
        { orderId: 16, locale: 'ko', gateway: 'toss' },
        { headers: { 'Idempotency-Key': expect.any(String) } },
      );
    });
    expect(await screen.findByTestId('payment-gateway')).toBeInTheDocument();
  }, 20000);
});

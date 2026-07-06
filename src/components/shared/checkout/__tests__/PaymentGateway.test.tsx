import { render, screen, act } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import PaymentGateway, { type PaymentGatewayHandle } from '@/components/shared/checkout/PaymentGateway';
import type { PreparePaymentResponse } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      tossPayment: '토스페이먼츠 (카드)',
      stripePayment: 'Stripe (International Card)',
      mockPayment: '테스트 결제 (Mock)',
      paypalPayment: 'PayPal',
      naverpayPayment: '네이버페이',
      naverpayDomesticBadge: '국내 전용',
      naverpayDomesticHint: '해외 사용자는 결제가 실패할 수 있습니다.',
      paypalRedirectHint: 'PayPal 승인 페이지로 이동합니다.',
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
      externalPaymentUnavailable: '결제 페이지를 열 수 없습니다.',
    };
    return dict[key] ?? key;
  },
}));

vi.mock('@tosspayments/tosspayments-sdk', () => ({
  loadTossPayments: vi.fn().mockResolvedValue({
    payment: vi.fn().mockReturnValue({
      requestPayment: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({
    elements: vi.fn().mockReturnValue({
      create: vi.fn().mockReturnValue({
        mount: vi.fn(),
        on: vi.fn(),
      }),
    }),
    confirmPayment: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

const baseProps = {
  orderId: 1,
  orderNumber: 'ORDER-001',
  amount: 50000,
  onError: vi.fn(),
};

describe('PaymentGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    delete window.Naver;
    delete window.EXIMBAY;
  });
  it('locale=ko + 유효 clientKey → Toss 라디오 표시', () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'toss',
      clientKey: 'test_ck_real_value',
    };
    render(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="ko"
        {...baseProps}
      />,
    );
    expect(screen.getByText('토스페이먼츠 (카드)')).toBeInTheDocument();
  });

  it('gateway=stripe + 유효 clientKey → Stripe Element 라디오 표시', () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'stripe',
      clientKey: 'pi_secret_value',
    };
    render(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="en"
        {...baseProps}
      />,
    );
    expect(screen.getByText('Stripe (International Card)')).toBeInTheDocument();
  });

  it('clientKey=mock_client_key → Mock 라디오 표시', () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'mock',
      clientKey: 'mock_client_key',
    };
    render(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="ko"
        {...baseProps}
      />,
    );
    expect(screen.getByText('테스트 결제 (Mock)')).toBeInTheDocument();
  });

  it('locale=en + clientKey=mock_client_key → Mock 라디오 (Stripe 분기 안 탐)', () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'stripe',
      clientKey: 'mock_client_key',
    };
    render(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="en"
        {...baseProps}
      />,
    );
    expect(screen.getByText('Test Payment (Mock)')).toBeInTheDocument();
    expect(screen.queryByText('Stripe (International Card)')).not.toBeInTheDocument();
  });



  it('gateway=paypal + redirectUrl → PayPal 라디오와 안내 표시', () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'paypal',
      clientKey: 'paypal-client',
      redirectUrl: 'https://www.paypal.com/checkoutnow?token=PAYPAL-ORDER-1',
      availableGateways: ['paypal', 'naverpay'],
    };
    render(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="en"
        {...baseProps}
      />,
    );
    expect(screen.getByText('PayPal')).toBeInTheDocument();
    expect(screen.getByText('PayPal 승인 페이지로 이동합니다.')).toBeInTheDocument();
  });

  it('gateway=naverpay → 국내 전용 배지를 표시', () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'naverpay',
      clientKey: 'naverpay-client',
      availableGateways: ['naverpay', 'paypal'],
      gatewayPayload: { chainId: 'naverpay-chain', mode: 'development' },
    };
    render(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="ko"
        {...baseProps}
      />,
    );
    expect(screen.getByText('네이버페이')).toBeInTheDocument();
    expect(screen.getByText('국내 전용')).toBeInTheDocument();
    expect(screen.getByText('해외 사용자는 결제가 실패할 수 있습니다.')).toBeInTheDocument();
  });


  it('gateway=naverpay confirm() → NaverPay SDK open 호출', async () => {
    const open = vi.fn();
    const create = vi.fn().mockReturnValue({ open });
    window.Naver = { Pay: { create } };
    const ref = createRef<PaymentGatewayHandle>();
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'naverpay',
      clientKey: 'naverpay-client',
      availableGateways: ['naverpay', 'paypal'],
      gatewayPayload: { chainId: 'naverpay-chain', mode: 'development' },
    };

    render(
      <PaymentGateway
        ref={ref}
        prepareResult={prepareResult}
        locale="ko"
        {...baseProps}
      />,
    );

    await act(async () => {
      await ref.current!.confirm();
    });

    expect(create).toHaveBeenCalledWith({
      mode: 'development',
      payType: 'normal',
      clientId: 'naverpay-client',
      chainId: 'naverpay-chain',
    });
    expect(open).toHaveBeenCalledWith(expect.objectContaining({
      merchantPayKey: 'ORDER-001',
      totalPayAmount: 50000,
      returnUrl: 'http://localhost:3000/ko/checkout/success',
    }));
    expect(sessionStorage.getItem('naverpayPaymentContext')).toContain('ORDER-001');
  });

  it('gateway=eximbay → 해외 커머스 카드 입력 shell을 표시하고 민감 필드는 readOnly로 둔다', () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'eximbay',
      clientKey: 'dummy_mid',
      availableGateways: ['eximbay', 'paypal', 'naverpay'],
      gatewayPayload: {
        fgkey: 'fgkey',
        jsSdkUrl: 'https://api-test.eximbay.com/v1/javascriptSDK.js',
        payment: '{}',
        merchant: '{}',
        buyer: '{}',
        url: '{}',
      },
    };

    render(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="ko"
        {...baseProps}
      />,
    );

    expect(screen.getByTestId('secure-card-entry-shell')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Credit card')).toBeInTheDocument();
    expect(screen.getByText('Visa')).toBeInTheDocument();
    expect(screen.getByText('Mastercard')).toBeInTheDocument();
    expect(screen.getByText('Amex')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Card number')).toHaveAttribute('readonly');
    expect(screen.getByPlaceholderText('Security code')).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
  });

  it('gateway=eximbay confirm() → Eximbay 보안 결제창 request_pay 호출', async () => {
    const requestPay = vi.fn();
    window.EXIMBAY = { request_pay: requestPay };
    const ref = createRef<PaymentGatewayHandle>();
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'eximbay',
      clientKey: 'dummy_mid',
      availableGateways: ['eximbay', 'paypal', 'naverpay'],
      gatewayPayload: {
        fgkey: 'fgkey',
        jsSdkUrl: 'https://api-test.eximbay.com/v1/javascriptSDK.js',
        payment: JSON.stringify({ order_id: 'ORDER-001' }),
        merchant: JSON.stringify({ mid: 'dummy_mid' }),
        buyer: JSON.stringify({ name: 'order_1' }),
        url: JSON.stringify({ return_url: 'http://localhost:3000/ko/checkout/success' }),
      },
    };

    render(
      <PaymentGateway
        ref={ref}
        prepareResult={prepareResult}
        locale="ko"
        {...baseProps}
      />,
    );

    await act(async () => {
      await ref.current!.confirm();
    });

    expect(requestPay).toHaveBeenCalledWith(expect.objectContaining({
      fgkey: 'fgkey',
      payment: { order_id: 'ORDER-001' },
      merchant: { mid: 'dummy_mid' },
    }));
    expect(sessionStorage.getItem('eximbayPaymentContext')).toContain('ORDER-001');
  });

  it('Mock gateway: confirm() 은 no-op (resolve)', async () => {
    const ref = createRef<PaymentGatewayHandle>();
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'mock',
      clientKey: 'mock_client_key',
    };
    render(
      <PaymentGateway
        ref={ref}
        prepareResult={prepareResult}
        locale="ko"
        {...baseProps}
      />,
    );
    await expect(ref.current!.confirm()).resolves.toBeUndefined();
  });
});

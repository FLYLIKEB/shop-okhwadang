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
    expect(screen.getByText('테스트 결제 (Mock)')).toBeInTheDocument();
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

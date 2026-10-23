import { uiMessages } from '@/i18n/ui-messages';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import PaymentGateway, { type PaymentGatewayHandle } from '@/components/shared/checkout/PaymentGateway';
import type { PreparePaymentResponse } from '@/lib/api';

const mockTossRequestPayment = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const stripeMocks = vi.hoisted(() => ({
  loadStripe: vi.fn(),
  eventHandlers: {} as Record<string, () => void>,
  unmount: vi.fn(),
  confirmPayment: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('next-intl', async () => {
  const { createTranslator } = await vi.importActual<typeof import('next-intl')>('next-intl');
  return {
    useTranslations: (namespace: 'checkout') => createTranslator({ locale: 'en', messages: uiMessages, namespace }),
  };
});

vi.mock('@tosspayments/tosspayments-sdk', () => ({
  ANONYMOUS: '@@ANONYMOUS',
  loadTossPayments: vi.fn().mockResolvedValue({
    widgets: vi.fn().mockReturnValue({
      setAmount: vi.fn().mockResolvedValue(undefined),
      renderPaymentMethods: vi.fn().mockResolvedValue({
        on: vi.fn(),
        getSelectedPaymentMethod: vi.fn().mockResolvedValue({ code: 'CARD' }),
        destroy: vi.fn().mockResolvedValue(undefined),
      }),
      renderAgreement: vi.fn().mockResolvedValue(undefined),
      requestPayment: mockTossRequestPayment,
    }),
  }),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: stripeMocks.loadStripe,
}));

const baseProps = {
  orderId: 1,
  orderNumber: 'ORDER-001',
  amount: 50000,
  onError: vi.fn(),
};

describe('PaymentGateway', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    delete window.Naver;
    delete window.EXIMBAY;
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_publishable';
    stripeMocks.eventHandlers = {};
    stripeMocks.loadStripe.mockResolvedValue({
      elements: vi.fn().mockReturnValue({
        create: vi.fn().mockReturnValue({
          mount: vi.fn(),
          unmount: stripeMocks.unmount,
          on: vi.fn((event: string, handler: () => void) => {
            stripeMocks.eventHandlers[event] = handler;
          }),
        }),
      }),
      confirmPayment: stripeMocks.confirmPayment,
    });
  });
  it('locale=ko + 유효 clientKey → Toss 결제위젯 영역을 렌더링한다', async () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'toss',
      clientKey: 'test_ck_real_value',
      gatewayPayload: { customerKey: 'member-customer-key' },
    };
    render(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="ko"
        {...baseProps}
      />,
    );
    expect(document.querySelector('#toss-payment-methods')).toBeInTheDocument();
    await act(async () => {});
    expect(document.querySelector('#toss-payment-methods')).toHaveAttribute('aria-busy', 'false');
  });

  it('autoConfirm이면 위젯 준비 직후 한 번만 결제창을 연다', async () => {
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'toss',
      clientKey: 'test_ck_real_value',
      gatewayPayload: { customerKey: 'member-customer-key' },
    };
    const { rerender } = render(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="ko"
        autoConfirm
        {...baseProps}
      />,
    );

    await act(async () => {});
    expect(mockTossRequestPayment).toHaveBeenCalledTimes(1);

    rerender(
      <PaymentGateway
        prepareResult={prepareResult}
        locale="ko"
        autoConfirm
        {...baseProps}
      />,
    );
    await act(async () => {});
    expect(mockTossRequestPayment).toHaveBeenCalledTimes(1);
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
    expect(screen.getByText(uiMessages.checkout.stripePayment)).toBeInTheDocument();
  });

  it('Stripe가 ready 전이면 confirm을 명시적으로 거부한다', async () => {
    const ref = createRef<PaymentGatewayHandle>();
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
        ref={ref}
        prepareResult={prepareResult}
        locale="en"
        {...baseProps}
      />,
    );

    await expect(ref.current?.confirm()).rejects.toThrow(
      'Payment methods are not ready yet.',
    );
    expect(stripeMocks.confirmPayment).not.toHaveBeenCalled();
  });

  it('Stripe 초기화 실패를 부모에 전달하고 재시도로 ready 상태를 복구한다', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const ref = createRef<PaymentGatewayHandle>();
    stripeMocks.loadStripe.mockRejectedValueOnce(new Error('sdk blocked'));
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
        ref={ref}
        prepareResult={prepareResult}
        locale="en"
        {...baseProps}
        onError={onError}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('sdk blocked');
    expect(onError).toHaveBeenCalledWith('sdk blocked');
    await expect(ref.current?.confirm()).rejects.toThrow();

    await user.click(screen.getByRole('button', { name: uiMessages.checkout.retryPaymentInitialization }));
    await waitFor(() => expect(stripeMocks.eventHandlers.ready).toBeTypeOf('function'));
    await act(async () => stripeMocks.eventHandlers.ready());
    await waitFor(() => {
      expect(screen.queryByText('Loading payment methods...')).not.toBeInTheDocument();
    });
    await expect(ref.current?.confirm()).resolves.toBeUndefined();
    expect(stripeMocks.confirmPayment).toHaveBeenCalledTimes(1);
  });

  it('Stripe loaderror 뒤 늦은 ready 이벤트가 오류와 재시도 UI를 덮지 않는다', async () => {
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

    await waitFor(() => expect(stripeMocks.eventHandlers.loaderror).toBeTypeOf('function'));
    await act(async () => stripeMocks.eventHandlers.loaderror());
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load payment methods.');

    await act(async () => stripeMocks.eventHandlers.ready());
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load payment methods.');
    expect(screen.getByRole('button', { name: uiMessages.checkout.retryPaymentInitialization })).toBeInTheDocument();
  });

  it('Stripe confirm 요청이 진행 중이면 중복 provider confirm을 거부한다', async () => {
    const ref = createRef<PaymentGatewayHandle>();
    let resolveConfirmation: ((value: { error: null }) => void) | undefined;
    stripeMocks.confirmPayment.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveConfirmation = resolve;
      }),
    );
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
        ref={ref}
        prepareResult={prepareResult}
        locale="en"
        {...baseProps}
      />,
    );
    await waitFor(() => expect(stripeMocks.eventHandlers.ready).toBeTypeOf('function'));
    await act(async () => stripeMocks.eventHandlers.ready());

    const firstConfirmation = ref.current!.confirm();
    await expect(ref.current!.confirm()).rejects.toThrow(
      'Payment confirmation is already in progress.',
    );
    expect(stripeMocks.confirmPayment).toHaveBeenCalledTimes(1);

    resolveConfirmation?.({ error: null });
    await expect(firstConfirmation).resolves.toBeUndefined();
  });

  it('loadStripe가 null을 반환하면 초기화 오류와 재시도를 표시한다', async () => {
    stripeMocks.loadStripe.mockResolvedValueOnce(null);
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to initialize Stripe payment.',
    );
    expect(screen.getByRole('button', { name: uiMessages.checkout.retryPaymentInitialization })).toBeInTheDocument();
  });

  it('Stripe 응답의 client secret이 비어도 mock으로 우회하지 않고 설정 오류를 표시한다', async () => {
    const ref = createRef<PaymentGatewayHandle>();
    const prepareResult: PreparePaymentResponse = {
      paymentId: 1,
      orderId: 1,
      orderNumber: 'ORDER-001',
      amount: 50000,
      gateway: 'stripe',
      clientKey: '',
    };
    render(
      <PaymentGateway
        ref={ref}
        prepareResult={prepareResult}
        locale="en"
        {...baseProps}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Stripe is not configured correctly.',
    );
    await expect(ref.current?.confirm()).rejects.toThrow();
    expect(screen.queryByText('Test Payment (Mock)')).not.toBeInTheDocument();
  });

  it('Stripe 초기화 promise가 끝나지 않으면 timeout 오류와 재시도를 표시한다', async () => {
    vi.useFakeTimers();
    stripeMocks.loadStripe.mockImplementationOnce(() => new Promise(() => undefined));
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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Payment methods took too long to load.',
    );
    expect(screen.getByRole('button', { name: uiMessages.checkout.retryPaymentInitialization })).toBeInTheDocument();
    vi.useRealTimers();
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
    expect(screen.getByText(/test payment \(mock\)/i)).toBeInTheDocument();
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
    expect(screen.getByText(/test payment \(mock\)/i)).toBeInTheDocument();
    expect(screen.queryByText(uiMessages.checkout.stripePayment)).not.toBeInTheDocument();
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
    expect(screen.getByRole('radio', { name: /PayPal/i })).toBeInTheDocument();
    expect(screen.queryByText('PayPal 승인 페이지로 이동합니다.')).not.toBeInTheDocument();
  });

  it('gateway=naverpay → 네이버페이만 표시', () => {
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
    expect(screen.getByRole('radio', { name: /Naver Pay/i })).toBeInTheDocument();
    expect(screen.queryByText('해외 사용자는 결제가 실패할 수 있습니다.')).not.toBeInTheDocument();
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
    expect(screen.getByText(uiMessages.checkout.cardPaymentTitle)).toBeInTheDocument();
    expect(screen.getByText(uiMessages.checkout.creditCardTitle)).toBeInTheDocument();
    expect(screen.getByLabelText('Visa')).toBeInTheDocument();
    expect(screen.getByLabelText('Mastercard')).toBeInTheDocument();
    expect(screen.getByLabelText('American Express')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(uiMessages.checkout.cardNumberPlaceholder)).toHaveAttribute('readonly');
    expect(screen.getByPlaceholderText(uiMessages.checkout.cardCvcPlaceholder)).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: uiMessages.checkout.payNow })).not.toBeInTheDocument();
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

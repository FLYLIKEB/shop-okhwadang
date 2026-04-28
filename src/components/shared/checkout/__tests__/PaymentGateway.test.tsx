import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import PaymentGateway, { type PaymentGatewayHandle } from '@/components/shared/checkout/PaymentGateway';
import type { PreparePaymentResponse } from '@/lib/api';

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

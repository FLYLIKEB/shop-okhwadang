import { render, screen } from '@testing-library/react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentMethodSelector } from '@/components/shared/checkout/PaymentMethodSelector';
import { getDefaultCheckoutGateway, getGatewayOptionsByLocale } from '@/constants/checkoutPaymentMethods';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      paymentMethod: 'Payment Method',
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
      cardPaymentTitle: 'Payment',
      cardPaymentSubtitle: 'Card details are entered only in the payment provider’s secure page.',
      creditCardTitle: 'Credit card',
      cardBrandsLabel: 'Supported card brands',
      cardNumberLabel: 'Card number',
      cardNumberPlaceholder: 'Card number',
      cardExpiryLabel: 'Expiry date',
      cardExpiryPlaceholder: 'MM / YY',
      cardCvcLabel: 'Security code',
      cardCvcPlaceholder: 'Security code',
      cardHolderLabel: 'Name on card',
      cardHolderPlaceholder: 'Name on card',
      billingSameAsShipping: 'Use shipping address as billing address',
      cardTermsAriaLabel: 'Card payment terms agreement',
      cardTermsAgreement: 'I agree to the payment terms and authorize the secure card payment.',
      payNow: 'Pay now',
      cardSecurePageNotice: 'Card details are never stored by Okhwadang.',
    };
    return dict[key] ?? key;
  },
}));

describe('PaymentMethodSelector', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS = 'toss,paypal,eximbay';
  });

  it('ko 정책은 토스페이먼츠 결제위젯만 노출한다', () => {
    const onSelect = vi.fn();
    const options = getGatewayOptionsByLocale('ko');

    render(
      <PaymentMethodSelector
        gatewayOptions={options}
        selectedGateway={getDefaultCheckoutGateway('ko')}
        onSelect={onSelect}
        showCardSubmitButton
      />,
    );

    expect(options).toEqual(['toss']);
    expect(screen.getByRole('radio', { name: /토스페이먼츠/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /네이버페이/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /무통장입금/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /PayPal/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('secure-card-entry-shell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bank-transfer-account-info')).not.toBeInTheDocument();
  });

  it('en 정책은 네이버페이를 숨기고 PayPal을 기본으로 둔다', () => {
    const options = getGatewayOptionsByLocale('en');

    render(
      <PaymentMethodSelector
        gatewayOptions={options}
        selectedGateway={getDefaultCheckoutGateway('en')}
        onSelect={vi.fn()}
      />,
    );

    expect(options).toEqual(['paypal', 'eximbay']);
    expect(screen.getByRole('radio', { name: /PayPal/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Credit card/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /네이버페이|Naver Pay/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /무통장입금|Bank transfer/ })).not.toBeInTheDocument();
  });

  it('NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS로 비활성 게이트웨이를 숨긴다', () => {
    const previous = process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS;
    process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS = 'toss';

    try {
      const options = getGatewayOptionsByLocale('ko');

      render(
        <PaymentMethodSelector
          gatewayOptions={options}
          selectedGateway={getDefaultCheckoutGateway('ko')}
          onSelect={vi.fn()}
        />,
      );

      expect(options).toEqual(['toss']);
      expect(screen.getByRole('radio', { name: /토스페이먼츠/ })).toBeChecked();
      expect(screen.queryByRole('radio', { name: /네이버페이|Naver Pay/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: /Credit card/ })).not.toBeInTheDocument();
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS;
      } else {
        process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS = previous;
      }
    }
  });
});

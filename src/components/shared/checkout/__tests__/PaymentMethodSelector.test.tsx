import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaymentMethodSelector } from '@/components/shared/checkout/PaymentMethodSelector';
import { getDefaultCheckoutGateway, getGatewayOptionsByLocale } from '@/constants/checkoutPaymentMethods';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      paymentMethod: 'Payment Method',
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
  it('ko 정책은 네이버페이 → 무통장입금 → PayPal → Credit card 순서이고 카드는 선택할 때만 열린다', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const options = getGatewayOptionsByLocale('ko');

    const { rerender } = render(
      <PaymentMethodSelector
        gatewayOptions={options}
        selectedGateway={getDefaultCheckoutGateway('ko')}
        onSelect={onSelect}
        showCardSubmitButton
      />,
    );

    expect(options).toEqual(['naverpay', 'bank_transfer', 'paypal', 'eximbay']);
    expect(screen.getByRole('radio', { name: /네이버페이/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /무통장입금/ })).toBeInTheDocument();
    expect(screen.queryByTestId('secure-card-entry-shell')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bank-transfer-account-info')).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /무통장입금/ }));
    expect(onSelect).toHaveBeenCalledWith('bank_transfer');

    rerender(
      <PaymentMethodSelector
        gatewayOptions={options}
        selectedGateway="bank_transfer"
        onSelect={onSelect}
        showCardSubmitButton
      />,
    );

    expect(screen.getByTestId('bank-transfer-account-info')).toBeInTheDocument();
    expect(screen.getByText('123456-78-901234')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Credit card/ }));
    expect(onSelect).toHaveBeenCalledWith('eximbay');

    rerender(
      <PaymentMethodSelector
        gatewayOptions={options}
        selectedGateway="eximbay"
        onSelect={onSelect}
        showCardSubmitButton
      />,
    );

    const cardShell = screen.getByTestId('secure-card-entry-shell');
    expect(cardShell).toBeInTheDocument();
    expect(cardShell.querySelector('[style]')).toBeNull();
    expect(screen.getByLabelText('Visa')).toBeInTheDocument();
    expect(screen.getByLabelText('Mastercard')).toBeInTheDocument();
    expect(screen.getByLabelText('American Express')).toBeInTheDocument();
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
});

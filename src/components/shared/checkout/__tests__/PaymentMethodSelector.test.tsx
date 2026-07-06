import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PaymentMethodSelector } from '@/components/shared/checkout/PaymentMethodSelector';
import { getDefaultCheckoutGateway, getGatewayOptionsByLocale } from '@/constants/checkoutPaymentMethods';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const dict: Record<string, string> = {
      paymentMethod: 'Payment Method',
      paymentMethodHint: 'Choose an express payment first, or select Credit card if you prefer card checkout.',
      paypalPayment: 'PayPal',
      naverpayPayment: '네이버페이',
      naverpayDomesticBadge: '국내 전용',
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
  it('ko 정책은 네이버페이 → PayPal → Credit card 순서이고 카드는 선택할 때만 열린다', async () => {
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

    expect(options).toEqual(['naverpay', 'paypal', 'eximbay']);
    expect(screen.getByRole('radio', { name: /네이버페이/ })).toBeChecked();
    expect(screen.queryByTestId('secure-card-entry-shell')).not.toBeInTheDocument();

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
  });
});

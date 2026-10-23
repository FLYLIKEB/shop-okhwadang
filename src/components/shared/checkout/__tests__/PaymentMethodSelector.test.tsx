import { uiMessages } from '@/i18n/ui-messages';
import { render, screen } from '@testing-library/react';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentMethodSelector } from '@/components/shared/checkout/PaymentMethodSelector';
import { getDefaultCheckoutGateway, getGatewayOptionsByLocale } from '@/constants/checkoutPaymentMethods';

vi.mock('next-intl', async () => {
  const { createTranslator } = await vi.importActual<typeof import('next-intl')>('next-intl');
  return {
    useTranslations: (namespace: 'checkout') => createTranslator({ locale: 'en', messages: uiMessages, namespace }),
  };
});

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
    expect(screen.getByRole('radio', { name: /Toss Payments/i })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /Naver Pay/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Bank transfer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /PayPal/i })).not.toBeInTheDocument();
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
    expect(screen.getByRole('radio', { name: /PayPal/i })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Credit card/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Naver Pay/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Bank transfer/i })).not.toBeInTheDocument();
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
      expect(screen.getByRole('radio', { name: /Toss Payments/i })).toBeChecked();
      expect(screen.queryByRole('radio', { name: /Naver Pay/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: /Credit card/i })).not.toBeInTheDocument();
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS;
      } else {
        process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS = previous;
      }
    }
  });

  it('unknown gateway가 섞인 frontend 설정은 결제수단 평가를 거부한다', () => {
    process.env.NEXT_PUBLIC_CHECKOUT_ENABLED_GATEWAYS = 'toss, typo-provider';

    expect(() => getGatewayOptionsByLocale('ko')).toThrow(
      'Unsupported checkout gateways: typo-provider',
    );
    expect(() => getGatewayOptionsByLocale('en')).toThrow(
      'Unsupported checkout gateways: typo-provider',
    );
  });
});

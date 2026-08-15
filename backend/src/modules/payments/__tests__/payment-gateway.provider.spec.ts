import type { PaymentConfig } from '../../../config/payment.config';
import { selectPaymentGatewayAdapter } from '../payment-gateway.provider';

function createConfig(gateway: PaymentConfig['gateway']): PaymentConfig {
  return { gateway } as PaymentConfig;
}

describe('selectPaymentGatewayAdapter', () => {
  const adapters = {
    mock: { name: 'mock' },
    toss: { name: 'toss' },
    stripe: { name: 'stripe' },
    inicis: { name: 'inicis' },
    paypal: { name: 'paypal' },
    eximbay: { name: 'eximbay' },
  };

  it.each([
    ['mock', adapters.mock],
    ['toss', adapters.toss],
    ['stripe', adapters.stripe],
    ['inicis', adapters.inicis],
    ['paypal', adapters.paypal],
    ['eximbay', adapters.eximbay],
  ] as const)('returns %s adapter', (gateway, expected) => {
    expect(selectPaymentGatewayAdapter(createConfig(gateway), adapters as never)).toBe(expected);
  });

  it('throws for unknown gateway values', () => {
    expect(() =>
      selectPaymentGatewayAdapter({ gateway: 'unknown' } as unknown as PaymentConfig, adapters as never),
    ).toThrow('Unknown PAYMENT_GATEWAY: unknown');
  });
});

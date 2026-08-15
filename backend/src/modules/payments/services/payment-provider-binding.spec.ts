import { BadRequestException } from '@nestjs/common';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { Payment, PaymentGatewayType } from '../entities/payment.entity';

const preparedPayment = (): Payment => ({
  id: 1,
  gateway: PaymentGatewayType.TOSS,
  providerTransactionId: null,
  providerOrderReference: 'ORD-1',
  expectedProviderAmount: 30000,
  expectedProviderCurrency: 'KRW',
  localOrderReference: 'ORD-1',
} as Payment);

const assertBinding = (payment: Payment, result: object) =>
  (PaymentConfirmationService.prototype as unknown as {
    assertProviderBinding(payment: Payment, result: object): void;
  }).assertProviderBinding(payment, result);

describe('payment provider transaction binding', () => {
  const settled = {
    paymentKey: 'pay_1',
    providerTransactionId: 'pay_1',
    providerOrderReference: 'ORD-1',
    providerAmount: 30000,
    providerCurrency: 'KRW',
  };

  it('accepts only the prepared order, exact amount, and currency', () => {
    expect(() => assertBinding(preparedPayment(), settled)).not.toThrow();
  });

  it('rejects missing provider binding evidence', () => {
    expect(() => assertBinding(preparedPayment(), {
      paymentKey: 'pay_1',
      providerTransactionId: 'pay_1',
      providerAmount: 30000,
      providerCurrency: 'KRW',
    })).toThrow(BadRequestException);
  });

  it.each([
    [{ ...settled, providerOrderReference: 'ORD-2' }],
    [{ ...settled, providerAmount: 29999 }],
    [{ ...settled, providerAmount: 30001 }],
    [{ ...settled, providerCurrency: 'USD' }],
  ])('rejects a mismatched settled provider transaction', (result) => {
    expect(() => assertBinding(preparedPayment(), result)).toThrow(BadRequestException);
  });
});

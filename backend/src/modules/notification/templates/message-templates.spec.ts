import { Order } from '../../orders/entities/order.entity';
import { Payment, PaymentMethod } from '../../payments/entities/payment.entity';
import { Shipping } from '../../payments/entities/shipping.entity';
import { buildTransactionalMessage } from './message-templates';

const order = {
  recipientName: '홍길동', orderNumber: 'ORD-123', totalAmount: 20000,
} as Order;

describe('transactional message display values', () => {
  it('matches the approved template variable sets', () => {
    const created = buildTransactionalMessage('ORDER_CREATED', {
      order, templateId: 'created', smsFallbackEnabled: true,
    });
    const delivered = buildTransactionalMessage('SHIPPING_DELIVERED', {
      order, templateId: 'delivered', smsFallbackEnabled: true,
    });
    const cancelled = buildTransactionalMessage('ORDER_CANCELLED', {
      order, cancelReason: '품절', templateId: 'cancelled', smsFallbackEnabled: true,
    });

    expect(Object.keys(created.variables).sort()).toEqual(['customerName', 'orderNumber', 'totalAmount']);
    expect(Object.keys(delivered.variables).sort()).toEqual(['customerName', 'orderNumber']);
    expect(Object.keys(cancelled.variables).sort()).toEqual(['cancelReason', 'customerName', 'orderNumber']);
    expect(created.fallbackText).toContain('주문금액: 20,000원');
  });

  it('uses customer-facing payment and carrier names in Kakao variables and SMS text', () => {
    const payment = buildTransactionalMessage('PAYMENT_CONFIRMED', {
      order, payment: { method: PaymentMethod.CARD, amount: 20000 } as Payment,
      templateId: 'payment', smsFallbackEnabled: true,
    });
    const shipping = buildTransactionalMessage('SHIPPING_STARTED', {
      order, shipping: { carrier: 'cj', trackingNumber: '123456' } as Shipping,
      templateId: 'shipping', smsFallbackEnabled: true,
    });

    expect(payment.variables.paymentMethod).toBe('카드');
    expect(payment.variables.totalAmount).toBe('20,000원');
    expect(payment.fallbackText).toContain('결제수단: 카드');
    expect(shipping.variables.carrier).toBe('CJ대한통운');
    expect(shipping.variables.totalAmount).toBeUndefined();
    expect(shipping.fallbackText).toContain('CJ대한통운 123456');
  });
});

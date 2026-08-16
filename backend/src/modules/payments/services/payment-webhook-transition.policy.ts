import { OrderStatus } from '../../orders/entities/order.entity';
import { PaymentStatus } from '../entities/payment.entity';

export type WebhookTransition = {
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  keywords: string[];
  setPaidAt?: boolean;
  setCancelledAt?: boolean;
};

export const PAYMENT_WEBHOOK_TRANSITIONS: WebhookTransition[] = [
  {
    paymentStatus: PaymentStatus.CONFIRMED,
    orderStatus: OrderStatus.PAID,
    keywords: ['DONE', 'PAID', 'CONFIRM'],
    setPaidAt: true,
  },
  {
    paymentStatus: PaymentStatus.REFUNDED,
    orderStatus: OrderStatus.REFUNDED,
    keywords: ['REFUND'],
    setCancelledAt: true,
  },
  {
    paymentStatus: PaymentStatus.CANCELLED,
    orderStatus: OrderStatus.CANCELLED,
    keywords: ['CANCEL'],
    setCancelledAt: true,
  },
];

export function resolveWebhookTransition(status: string): WebhookTransition | null {
  const normalized = status.toUpperCase();
  if (['DONE', 'PAID', 'SALE', 'PAYMENT.CAPTURE.COMPLETED', 'PAYMENT_INTENT.SUCCEEDED'].includes(normalized)) {
    return PAYMENT_WEBHOOK_TRANSITIONS[0];
  }
  if (['REFUNDED'].includes(normalized)) {
    return PAYMENT_WEBHOOK_TRANSITIONS[1];
  }
  if (['CANCELLED', 'CANCELED'].includes(normalized)) {
    return PAYMENT_WEBHOOK_TRANSITIONS[2];
  }
  return null;
}


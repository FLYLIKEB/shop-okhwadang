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


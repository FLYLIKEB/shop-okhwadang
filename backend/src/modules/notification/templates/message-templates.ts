import { Order } from '../../orders/entities/order.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Shipping } from '../../payments/entities/shipping.entity';
import { MessageTemplateKey, TransactionalMessage } from '../interfaces/message-provider.interface';

interface MessageTemplateInput {
  order: Order;
  templateId: string;
  smsFallbackEnabled: boolean;
  payment?: Payment | null;
  shipping?: Shipping | null;
  paymentMethod?: string;
  cancelReason?: string;
}

type BuiltMessage = Omit<TransactionalMessage, 'to' | 'idempotencyKey'>;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: '카드',
  bank_transfer: '계좌이체',
  virtual_account: '가상계좌',
  phone: '휴대폰',
  mock: '테스트 결제',
  paypal: 'PayPal',
  eximbay: '카드',
};

const CARRIER_LABELS: Record<string, string> = {
  cj: 'CJ대한통운',
  hanjin: '한진택배',
  lotte: '롯데택배',
  mock: '택배',
};

function money(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString('ko-KR')}원`;
}

function commonVariables(order: Order): Record<string, string> {
  return {
    customerName: order.recipientName,
    orderNumber: order.orderNumber,
  };
}

export function buildTransactionalMessage(
  templateKey: MessageTemplateKey,
  input: MessageTemplateInput,
): BuiltMessage {
  const { order, templateId, smsFallbackEnabled } = input;
  const variables = commonVariables(order);

  switch (templateKey) {
    case 'ORDER_CREATED':
      return {
        templateKey,
        templateId,
        variables: { ...variables, totalAmount: money(order.totalAmount) },
        fallbackText: `[옥화당] ${order.recipientName}님, 주문 ${order.orderNumber} 접수가 완료되었습니다. 주문금액: ${money(order.totalAmount)}`,
        smsFallbackEnabled,
      };
    case 'ORDER_CANCELLED': {
      const cancelReason = input.cancelReason ?? '';
      return {
        templateKey,
        templateId,
        variables: { ...variables, cancelReason },
        fallbackText: `[옥화당] ${order.recipientName}님, 주문 ${order.orderNumber}이(가) 취소되었습니다. 취소 사유: ${cancelReason}`,
        smsFallbackEnabled,
      };
    }
    case 'PAYMENT_CONFIRMED': {
      const method = PAYMENT_METHOD_LABELS[input.paymentMethod ?? input.payment?.method ?? ''] ?? '결제';
      return {
        templateKey,
        templateId,
        variables: { ...variables, totalAmount: money(input.payment?.amount ?? order.totalAmount), paymentMethod: method },
        fallbackText: `[옥화당] ${order.recipientName}님, 주문 ${order.orderNumber} 결제가 완료되었습니다. 결제금액: ${money(input.payment?.amount ?? order.totalAmount)}, 결제수단: ${method}`,
        smsFallbackEnabled,
      };
    }
    case 'SHIPPING_STARTED': {
      const carrier = CARRIER_LABELS[input.shipping?.carrier ?? ''] ?? '택배';
      const trackingNumber = input.shipping?.trackingNumber ?? '';
      return {
        templateKey,
        templateId,
        variables: { ...variables, carrier, trackingNumber },
        fallbackText: `[옥화당] ${order.recipientName}님, 주문 ${order.orderNumber} 배송이 시작되었습니다. ${carrier} ${trackingNumber}`.trim(),
        smsFallbackEnabled,
      };
    }
    case 'SHIPPING_DELIVERED':
      return {
        templateKey,
        templateId,
        variables,
        fallbackText: `[옥화당] ${order.recipientName}님, 주문 ${order.orderNumber} 배송이 완료되었습니다. 이용해 주셔서 감사합니다.`,
        smsFallbackEnabled,
      };
  }
}

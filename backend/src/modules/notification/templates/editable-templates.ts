import * as email from './render';
import { escapeHtml } from './sanitize';
import { MessageTemplateKey } from '../interfaces/message-provider.interface';

export const emailRenderers = {
  ORDER_CONFIRMED: email.renderOrderConfirmed,
  ORDER_CANCELLED: email.renderOrderCancelled,
  PAYMENT_CONFIRMED: email.renderPaymentConfirmed,
  SHIPPING_UPDATE: email.renderShippingUpdate,
  INQUIRY_ANSWERED: email.renderInquiryAnswered,
  PASSWORD_RESET: email.renderPasswordReset,
  EMAIL_VERIFICATION: email.renderEmailVerification,
  RESTOCK_ALERT: email.renderRestockAlert,
};
export type EmailTemplateKey = keyof typeof emailRenderers;
export type EmailContext = Parameters<(typeof emailRenderers)[EmailTemplateKey]>[0];
export const messageDefaults: Record<MessageTemplateKey, string> = {
  ORDER_CREATED: '[옥화당] {{customerName}}님, 주문 {{orderNumber}} 접수가 완료되었습니다. 주문금액: {{totalAmount}}',
  ORDER_CANCELLED: '[옥화당] {{customerName}}님, 주문 {{orderNumber}}이(가) 취소되었습니다. 취소 사유: {{cancelReason}}',
  PAYMENT_CONFIRMED: '[옥화당] {{customerName}}님, 주문 {{orderNumber}} 결제가 완료되었습니다. 결제금액: {{totalAmount}}, 결제수단: {{paymentMethod}}',
  SHIPPING_STARTED: '[옥화당] {{customerName}}님, 주문 {{orderNumber}} 배송이 시작되었습니다. {{carrier}} {{trackingNumber}}',
  SHIPPING_DELIVERED: '[옥화당] {{customerName}}님, 주문 {{orderNumber}} 배송이 완료되었습니다. 이용해 주셔서 감사합니다.',
};
export const sampleContext = {
  recipientName: '미리보기 고객', customerName: '미리보기 고객', orderNumber: 'PREVIEW-20260001',
  totalAmount: 42000, amount: 42000, method: '카드', paymentMethod: '카드',
  reason: '고객 요청', cancelReason: '고객 요청', carrier: 'CJ대한통운', trackingNumber: '123456789000',
  inquiryTitle: '상품 문의', answer: '문의해 주셔서 감사합니다.\n확인 후 안내드립니다.',
  resetUrl: 'https://example.com/reset-password?token=preview',
  verificationUrl: 'https://example.com/verify-email?token=preview', expiresInMinutes: 30,
  productName: '미리보기 찻잔', productUrl: 'https://example.com/products/preview', optionLabel: '백색',
  orderUrl: 'https://example.com/orders/preview',
  orderItems: [{ productName: '미리보기 찻잔', quantity: 2, unitPrice: 21000 }],
};

export function emailDefault(key: EmailTemplateKey, locale: 'ko' | 'en'): email.RenderedEmail {
  const context = { ...sampleContext, locale, totalAmount: 987654321, amount: 987654322, expiresInMinutes: 987654323 };
  for (const name of Object.keys(sampleContext)) {
    if (typeof sampleContext[name as keyof typeof sampleContext] === 'string') {
      Object.assign(context, { [name]: `{{${name}}}` });
    }
  }
  const rendered = emailRenderers[key](context);
  const replace = (value: string) => value
    .replaceAll(' ({{optionLabel}})', '{{optionSuffix}}')
    .replaceAll('987,654,321원', '{{totalAmount}}')
    .replaceAll('987,654,322원', '{{amount}}')
    .replaceAll('987654323', '{{expiresInMinutes}}')
    .replace(email.renderOrderItemsHtml(context.orderItems, locale), '{{orderItemsHtml}}')
    .replace(email.renderOrderItemsText(context.orderItems, locale), '{{orderItemsText}}');
  return { subject: replace(rendered.subject), html: replace(rendered.html), text: replace(rendered.text) };
}

export function substitute(source: string, variables: Record<string, string>, html = false): string {
  return source.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    const value = variables[name] ?? '';
    return html && name !== 'orderItemsHtml' ? escapeHtml(value).replace(/\n/g, '<br>') : value;
  });
}

export function emailVariables(context: EmailContext): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(context)) {
    if (typeof value === 'string' || typeof value === 'number') values[name] = String(value);
  }
  for (const name of ['amount', 'totalAmount']) {
    if (name in values) {
      const usd = name === 'amount' ? values.amountUsd : values.totalUsd;
      values[name] = email.formatEmailMoney(Number(values[name]), usd == null ? undefined : Number(usd), context.locale);
    }
  }
  const items = 'orderItems' in context ? context.orderItems : undefined;
  values.orderItemsHtml = email.renderOrderItemsHtml(items, context.locale ?? 'ko');
  values.orderItemsText = email.renderOrderItemsText(items, context.locale ?? 'ko');
  values.optionSuffix = 'optionLabel' in context && context.optionLabel ? ` (${context.optionLabel})` : '';
  return values;
}

export function renderEditableEmail(template: email.RenderedEmail, context: EmailContext): email.RenderedEmail {
  const variables = emailVariables(context);
  const html = variables.orderUrl ? template.html : template.html.replace(/<a\b[^>]*\bhref=["']\{\{orderUrl\}\}["'][^>]*>[\s\S]*?<\/a>/gi, '');
  const text = variables.orderUrl ? template.text : template.text.split('\n').filter(line => !/^(주문 상세 보기|View order): \{\{orderUrl\}\}$/.test(line)).join('\n');
  return { subject: substitute(template.subject, variables), html: substitute(html, variables, true), text: substitute(text, variables) };
}

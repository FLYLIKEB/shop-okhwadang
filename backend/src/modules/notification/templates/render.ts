import { escapeHtml, sanitizeContext } from './sanitize';

export interface OrderConfirmedContext {
  recipientName: string;
  orderNumber: string;
  totalAmount: number;
  locale?: 'ko' | 'en';
}

export interface PaymentConfirmedContext {
  recipientName: string;
  orderNumber: string;
  amount: number;
  method: string;
  locale?: 'ko' | 'en';
}

export interface ShippingUpdateContext {
  recipientName: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  locale?: 'ko' | 'en';
}

export interface InquiryAnsweredContext {
  recipientName: string;
  inquiryTitle: string;
  answer: string;
  locale?: 'ko' | 'en';
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

function formatKRW(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function renderOrderConfirmed(raw: OrderConfirmedContext): RenderedEmail {
  const ctx = sanitizeContext(raw as unknown as Record<string, unknown>) as unknown as typeof raw;
  const isKo = (ctx.locale ?? 'ko') === 'ko';
  const subject = isKo
    ? `[옥화당] 주문이 접수되었습니다 (${ctx.orderNumber})`
    : `[Okhwadang] Order received (${ctx.orderNumber})`;
  const text = isKo
    ? `${ctx.recipientName}님, 주문 ${ctx.orderNumber}이(가) 접수되었습니다. 결제금액: ${formatKRW(ctx.totalAmount)}`
    : `Hi ${ctx.recipientName}, your order ${ctx.orderNumber} has been received. Total: ${formatKRW(ctx.totalAmount)}`;
  const html = `<div><h2>${escapeHtml(subject)}</h2><p>${escapeHtml(text)}</p></div>`;
  return { subject, html, text };
}

export function renderPaymentConfirmed(raw: PaymentConfirmedContext): RenderedEmail {
  const ctx = sanitizeContext(raw as unknown as Record<string, unknown>) as unknown as typeof raw;
  const isKo = (ctx.locale ?? 'ko') === 'ko';
  const subject = isKo
    ? `[옥화당] 결제가 완료되었습니다 (${ctx.orderNumber})`
    : `[Okhwadang] Payment confirmed (${ctx.orderNumber})`;
  const text = isKo
    ? `${ctx.recipientName}님, 주문 ${ctx.orderNumber}의 결제(${ctx.method})가 완료되었습니다. 금액: ${formatKRW(ctx.amount)}`
    : `Hi ${ctx.recipientName}, payment for order ${ctx.orderNumber} via ${ctx.method} is confirmed. Amount: ${formatKRW(ctx.amount)}`;
  const html = `<div><h2>${escapeHtml(subject)}</h2><p>${escapeHtml(text)}</p></div>`;
  return { subject, html, text };
}

export function renderShippingUpdate(raw: ShippingUpdateContext): RenderedEmail {
  const ctx = sanitizeContext(raw as unknown as Record<string, unknown>) as unknown as typeof raw;
  const isKo = (ctx.locale ?? 'ko') === 'ko';
  const subject = isKo
    ? `[옥화당] 배송이 시작되었습니다 (${ctx.orderNumber})`
    : `[Okhwadang] Shipment started (${ctx.orderNumber})`;
  const text = isKo
    ? `${ctx.recipientName}님, 주문 ${ctx.orderNumber}이(가) 발송되었습니다. 택배사: ${ctx.carrier}, 송장번호: ${ctx.trackingNumber}`
    : `Hi ${ctx.recipientName}, order ${ctx.orderNumber} has shipped. Carrier: ${ctx.carrier}, Tracking: ${ctx.trackingNumber}`;
  const html = `<div><h2>${escapeHtml(subject)}</h2><p>${escapeHtml(text)}</p></div>`;
  return { subject, html, text };
}

export function renderInquiryAnswered(raw: InquiryAnsweredContext): RenderedEmail {
  const ctx = sanitizeContext(raw as unknown as Record<string, unknown>) as unknown as typeof raw;
  const isKo = (ctx.locale ?? 'ko') === 'ko';
  const subject = isKo
    ? `[옥화당] 문의에 답변이 등록되었습니다`
    : `[Okhwadang] Your inquiry has been answered`;
  const text = isKo
    ? `${ctx.recipientName}님, 문의하신 "${ctx.inquiryTitle}"에 답변이 등록되었습니다.\n\n${ctx.answer}`
    : `Hi ${ctx.recipientName}, your inquiry "${ctx.inquiryTitle}" has been answered.\n\n${ctx.answer}`;
  const html = `<div><h2>${escapeHtml(subject)}</h2><p>${escapeHtml(text).replace(/\n/g, '<br>')}</p></div>`;
  return { subject, html, text };
}

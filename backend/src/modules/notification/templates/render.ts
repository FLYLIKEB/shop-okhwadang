import { escapeHtml } from './sanitize';

export interface OrderEmailItem {
  productName: string;
  optionName?: string | null;
  quantity: number;
  unitPrice: number;
  productUrl?: string;
}

interface OrderEmailContext {
  orderItems?: OrderEmailItem[];
  orderUrl?: string;
}

export interface OrderConfirmedContext extends OrderEmailContext {
  recipientName: string;
  orderNumber: string;
  totalAmount: number;
  locale?: 'ko' | 'en';
}

export interface OrderCancelledContext extends OrderEmailContext {
  recipientName: string;
  orderNumber: string;
  reason: string;
  locale?: 'ko' | 'en';
}

export interface PaymentConfirmedContext extends OrderEmailContext {
  recipientName: string;
  orderNumber: string;
  amount: number;
  method: string;
  locale?: 'ko' | 'en';
}

export interface ShippingUpdateContext extends OrderEmailContext {
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

export interface PasswordResetContext {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
  locale?: 'ko' | 'en';
}

export interface EmailVerificationContext {
  recipientName: string;
  verificationUrl: string;
  expiresInMinutes: number;
  locale?: 'ko' | 'en';
}

export interface RestockAlertContext {
  recipientName: string;
  productName: string;
  productUrl: string;
  optionLabel?: string;
  locale?: 'ko' | 'en';
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface SummaryRow {
  label: string;
  value: string;
}

interface EmailLayoutOptions {
  locale: 'ko' | 'en';
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  summaryRows?: SummaryRow[];
  bodyHtml?: string;
  bodyText?: string;
  cta?: { label: string; url: string };
  orderItems?: OrderEmailItem[];
  footerNote?: string;
}

const brand = {
  ko: {
    name: '옥화당',
    tagline: '차와 다구를 위한 조용한 선택',
    footer: '본 메일은 옥화당 서비스 이용에 따라 발송된 안내 메일입니다.',
    itemsTitle: '주문 상품',
    viewProduct: '상품 보기',
    quantity: '수량',
    unitPrice: '단가',
  },
  en: {
    name: 'Ockhwadang',
    tagline: 'Quiet selections for tea and teaware',
    footer: 'This transactional email was sent because you use Ockhwadang.',
    itemsTitle: 'Order items',
    viewProduct: 'View product',
    quantity: 'Qty',
    unitPrice: 'Unit price',
  },
};

function formatKRW(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function textWithLines(lines: Array<string | undefined | false>): string {
  return lines.filter(Boolean).join('\n');
}

function style(value: string): string {
  return value.replace(/\n\s*/g, ' ').trim();
}

function escapeAttribute(input: string): string {
  return escapeHtml(input);
}

function renderSummaryRows(rows: SummaryRow[] = []): string {
  if (!rows.length) return '';
  const cells = rows.map((row) => `
    <tr>
      <td style="${style('padding:12px 0;border-bottom:1px solid #eee7dc;color:#7d7263;font-size:13px;')}" valign="top">${escapeHtml(row.label)}</td>
      <td style="${style('padding:12px 0;border-bottom:1px solid #eee7dc;color:#2f281f;font-size:14px;font-weight:600;text-align:right;')}" valign="top">${escapeHtml(row.value)}</td>
    </tr>`).join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:22px 0 6px;">${cells}</table>`;
}

function renderOrderItemsHtml(items: OrderEmailItem[] | undefined, locale: 'ko' | 'en'): string {
  if (!items?.length) return '';
  const copy = brand[locale];
  const rows = items.map((item) => {
    const option = item.optionName ? `<div style="${style('margin-top:4px;color:#8a7d6b;font-size:12px;line-height:1.5;')}">${escapeHtml(item.optionName)}</div>` : '';
    const link = item.productUrl
      ? `<a href="${escapeAttribute(item.productUrl)}" style="${style('display:inline-block;margin-top:8px;color:#6f4e2a;font-size:12px;font-weight:700;text-decoration:none;')}">${escapeHtml(copy.viewProduct)} →</a>`
      : '';
    return `
      <tr>
        <td style="${style('padding:16px 0;border-bottom:1px solid #eee7dc;')}">
          <div style="${style('color:#2f281f;font-size:15px;font-weight:700;line-height:1.45;')}">${escapeHtml(item.productName)}</div>
          ${option}
          ${link}
        </td>
        <td style="${style('padding:16px 0;border-bottom:1px solid #eee7dc;color:#5d5245;font-size:13px;text-align:center;white-space:nowrap;')}" valign="top">${escapeHtml(String(item.quantity))}</td>
        <td style="${style('padding:16px 0;border-bottom:1px solid #eee7dc;color:#2f281f;font-size:13px;text-align:right;white-space:nowrap;')}" valign="top">${escapeHtml(formatKRW(item.unitPrice))}</td>
      </tr>`;
  }).join('');

  return `
    <div style="${style('margin-top:28px;')}">
      <h3 style="${style('margin:0 0 12px;color:#2f281f;font-size:16px;line-height:1.35;')}">${escapeHtml(copy.itemsTitle)}</h3>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${style('border-collapse:collapse;')}">
        <thead>
          <tr>
            <th align="left" style="${style('padding:0 0 8px;color:#9b8c78;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #d9cdbb;')}">${escapeHtml(copy.itemsTitle)}</th>
            <th align="center" style="${style('padding:0 0 8px;color:#9b8c78;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #d9cdbb;')}">${escapeHtml(copy.quantity)}</th>
            <th align="right" style="${style('padding:0 0 8px;color:#9b8c78;font-size:11px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #d9cdbb;')}">${escapeHtml(copy.unitPrice)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderOrderItemsText(items: OrderEmailItem[] | undefined, locale: 'ko' | 'en'): string {
  if (!items?.length) return '';
  const copy = brand[locale];
  return [
    copy.itemsTitle,
    ...items.map((item) => {
      const option = item.optionName ? ` / ${item.optionName}` : '';
      const url = item.productUrl ? `\n  ${copy.viewProduct}: ${item.productUrl}` : '';
      return `- ${item.productName}${option} x ${item.quantity} · ${formatKRW(item.unitPrice)}${url}`;
    }),
  ].join('\n');
}

function renderEmailLayout(options: EmailLayoutOptions): RenderedEmail {
  const copy = brand[options.locale];
  const summaryHtml = renderSummaryRows(options.summaryRows);
  const itemsHtml = renderOrderItemsHtml(options.orderItems, options.locale);
  const ctaHtml = options.cta
    ? `<div style="${style('margin-top:28px;text-align:center;')}"><a href="${escapeAttribute(options.cta.url)}" style="${style('display:inline-block;background:#3a2c1f;color:#fff7ec;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:.01em;padding:13px 22px;border-radius:999px;')}">${escapeHtml(options.cta.label)}</a></div>`
    : '';
  const footerNote = options.footerNote ?? copy.footer;
  const bodyHtml = options.bodyHtml ?? '';

  const html = `<!doctype html>
<html lang="${options.locale}">
  <body style="${style('margin:0;padding:0;background:#f6f0e8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2f281f;')}">
    <div style="${style('display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;')}">${escapeHtml(options.intro)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${style('border-collapse:collapse;background:#f6f0e8;padding:0;margin:0;')}">
      <tr>
        <td align="center" style="${style('padding:32px 14px;')}">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${style('max-width:640px;border-collapse:collapse;background:#fffaf3;border:1px solid #e7dac8;border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(58,44,31,.08);')}">
            <tr>
              <td style="${style('padding:28px 30px;background:#33271d;color:#fff7ec;')}">
                <div style="${style('font-size:20px;font-weight:800;letter-spacing:.02em;')}">${escapeHtml(copy.name)}</div>
                <div style="${style('margin-top:6px;color:#d9cdbb;font-size:12px;letter-spacing:.08em;text-transform:uppercase;')}">${escapeHtml(copy.tagline)}</div>
              </td>
            </tr>
            <tr>
              <td style="${style('padding:34px 30px 30px;')}">
                <div style="${style('color:#9b6f35;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;')}">${escapeHtml(options.eyebrow)}</div>
                <h1 style="${style('margin:10px 0 12px;color:#2f281f;font-size:28px;line-height:1.22;font-weight:800;')}">${escapeHtml(options.title)}</h1>
                <p style="${style('margin:0;color:#5f5346;font-size:15px;line-height:1.75;')}">${escapeHtml(options.intro)}</p>
                ${summaryHtml}
                ${bodyHtml}
                ${itemsHtml}
                ${ctaHtml}
              </td>
            </tr>
            <tr>
              <td style="${style('padding:20px 30px;background:#f0e7da;color:#7d7263;font-size:12px;line-height:1.6;')}">
                ${escapeHtml(footerNote)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const summaryText = options.summaryRows?.map((row) => `${row.label}: ${row.value}`).join('\n') ?? '';
  const itemsText = renderOrderItemsText(options.orderItems, options.locale);
  const ctaText = options.cta ? `${options.cta.label}: ${options.cta.url}` : '';
  const text = textWithLines([
    options.title,
    options.intro,
    summaryText,
    options.bodyText,
    itemsText,
    ctaText,
    footerNote,
  ]);

  return { subject: options.subject, html, text };
}

export function renderOrderConfirmed(ctx: OrderConfirmedContext): RenderedEmail {
  const locale = ctx.locale ?? 'ko';
  const isKo = locale === 'ko';
  const subject = isKo
    ? `[옥화당] 주문이 접수되었습니다 (${ctx.orderNumber})`
    : `[Ockhwadang] Order received (${ctx.orderNumber})`;
  return renderEmailLayout({
    locale,
    subject,
    eyebrow: isKo ? 'Order received' : 'Order received',
    title: isKo ? '주문이 접수되었습니다' : 'Your order has been received',
    intro: isKo
      ? `${ctx.recipientName}님, 주문을 확인했습니다. 결제 완료 후 준비가 시작됩니다.`
      : `Hi ${ctx.recipientName}, we received your order. Preparation begins after payment is confirmed.`,
    summaryRows: [
      { label: isKo ? '주문번호' : 'Order number', value: ctx.orderNumber },
      { label: isKo ? '결제 예정 금액' : 'Amount due', value: formatKRW(ctx.totalAmount) },
    ],
    orderItems: ctx.orderItems,
    cta: ctx.orderUrl ? { label: isKo ? '주문 상세 보기' : 'View order', url: ctx.orderUrl } : undefined,
  });
}

export function renderOrderCancelled(ctx: OrderCancelledContext): RenderedEmail {
  const locale = ctx.locale ?? 'ko';
  const isKo = locale === 'ko';
  const subject = isKo
    ? `[옥화당] 주문이 취소되었습니다 (${ctx.orderNumber})`
    : `[Ockhwadang] Order cancelled (${ctx.orderNumber})`;
  return renderEmailLayout({
    locale,
    subject,
    eyebrow: isKo ? 'Order cancelled' : 'Order cancelled',
    title: isKo ? '주문이 취소되었습니다' : 'Your order has been cancelled',
    intro: isKo
      ? `${ctx.recipientName}님, 아래 주문의 취소 처리가 완료되었습니다.`
      : `Hi ${ctx.recipientName}, the order below has been cancelled.`,
    summaryRows: [
      { label: isKo ? '주문번호' : 'Order number', value: ctx.orderNumber },
      { label: isKo ? '취소 사유' : 'Reason', value: ctx.reason },
    ],
    orderItems: ctx.orderItems,
    cta: ctx.orderUrl ? { label: isKo ? '주문 상세 보기' : 'View order', url: ctx.orderUrl } : undefined,
  });
}

export function renderPaymentConfirmed(ctx: PaymentConfirmedContext): RenderedEmail {
  const locale = ctx.locale ?? 'ko';
  const isKo = locale === 'ko';
  const subject = isKo
    ? `[옥화당] 결제가 완료되었습니다 (${ctx.orderNumber})`
    : `[Ockhwadang] Payment confirmed (${ctx.orderNumber})`;
  return renderEmailLayout({
    locale,
    subject,
    eyebrow: isKo ? 'Payment confirmed' : 'Payment confirmed',
    title: isKo ? '결제가 완료되었습니다' : 'Payment confirmed',
    intro: isKo
      ? `${ctx.recipientName}님, 결제가 정상 승인되었습니다. 정성껏 준비해 보내드리겠습니다.`
      : `Hi ${ctx.recipientName}, your payment has been approved. We will prepare your order with care.`,
    summaryRows: [
      { label: isKo ? '주문번호' : 'Order number', value: ctx.orderNumber },
      { label: isKo ? '결제수단' : 'Payment method', value: ctx.method },
      { label: isKo ? '결제금액' : 'Amount paid', value: formatKRW(ctx.amount) },
    ],
    orderItems: ctx.orderItems,
    cta: ctx.orderUrl ? { label: isKo ? '주문 상세 보기' : 'View order', url: ctx.orderUrl } : undefined,
  });
}

export function renderShippingUpdate(ctx: ShippingUpdateContext): RenderedEmail {
  const locale = ctx.locale ?? 'ko';
  const isKo = locale === 'ko';
  const subject = isKo
    ? `[옥화당] 배송이 시작되었습니다 (${ctx.orderNumber})`
    : `[Ockhwadang] Shipment started (${ctx.orderNumber})`;
  return renderEmailLayout({
    locale,
    subject,
    eyebrow: isKo ? 'Shipment started' : 'Shipment started',
    title: isKo ? '배송이 시작되었습니다' : 'Your shipment is on the way',
    intro: isKo
      ? `${ctx.recipientName}님, 주문하신 상품이 출고되었습니다.`
      : `Hi ${ctx.recipientName}, your order has shipped.`,
    summaryRows: [
      { label: isKo ? '주문번호' : 'Order number', value: ctx.orderNumber },
      { label: isKo ? '택배사' : 'Carrier', value: ctx.carrier },
      { label: isKo ? '송장번호' : 'Tracking number', value: ctx.trackingNumber },
    ],
    orderItems: ctx.orderItems,
    cta: ctx.orderUrl ? { label: isKo ? '주문 상세 보기' : 'View order', url: ctx.orderUrl } : undefined,
  });
}

export function renderInquiryAnswered(ctx: InquiryAnsweredContext): RenderedEmail {
  const locale = ctx.locale ?? 'ko';
  const isKo = locale === 'ko';
  const subject = isKo
    ? '[옥화당] 문의에 답변이 등록되었습니다'
    : '[Ockhwadang] Your inquiry has been answered';
  const answerHtml = `<div style="${style('margin-top:24px;padding:18px 20px;background:#f8f1e8;border:1px solid #eadfce;border-radius:16px;color:#4e4337;font-size:14px;line-height:1.8;')}">${escapeHtml(ctx.answer).replace(/\n/g, '<br>')}</div>`;
  return renderEmailLayout({
    locale,
    subject,
    eyebrow: isKo ? 'Inquiry answered' : 'Inquiry answered',
    title: isKo ? '문의 답변이 등록되었습니다' : 'Your inquiry has been answered',
    intro: isKo
      ? `${ctx.recipientName}님, 문의하신 “${ctx.inquiryTitle}”에 답변이 등록되었습니다.`
      : `Hi ${ctx.recipientName}, your inquiry “${ctx.inquiryTitle}” has been answered.`,
    bodyHtml: answerHtml,
    bodyText: ctx.answer,
  });
}

export function renderPasswordReset(ctx: PasswordResetContext): RenderedEmail {
  const locale = ctx.locale ?? 'ko';
  const isKo = locale === 'ko';
  const subject = isKo ? '[옥화당] 비밀번호 재설정 안내' : '[Ockhwadang] Reset your password';
  return renderEmailLayout({
    locale,
    subject,
    eyebrow: isKo ? 'Password reset' : 'Password reset',
    title: isKo ? '비밀번호를 재설정해 주세요' : 'Reset your password',
    intro: isKo
      ? `${ctx.recipientName}님, 아래 버튼으로 비밀번호를 재설정할 수 있습니다. 링크는 ${ctx.expiresInMinutes}분 후 만료됩니다.`
      : `Hi ${ctx.recipientName}, use the button below to reset your password. It expires in ${ctx.expiresInMinutes} minutes.`,
    cta: { label: isKo ? '비밀번호 재설정' : 'Reset password', url: ctx.resetUrl },
  });
}

export function renderEmailVerification(ctx: EmailVerificationContext): RenderedEmail {
  const locale = ctx.locale ?? 'ko';
  const isKo = locale === 'ko';
  const subject = isKo ? '[옥화당] 이메일 인증을 완료해 주세요' : '[Ockhwadang] Please verify your email';
  return renderEmailLayout({
    locale,
    subject,
    eyebrow: isKo ? 'Email verification' : 'Email verification',
    title: isKo ? '이메일 인증을 완료해 주세요' : 'Please verify your email',
    intro: isKo
      ? `${ctx.recipientName}님, 아래 버튼을 클릭해 이메일 인증을 완료해 주세요. 링크는 ${ctx.expiresInMinutes}분 후 만료됩니다.`
      : `Hi ${ctx.recipientName}, click the button below to verify your email address. The link expires in ${ctx.expiresInMinutes} minutes.`,
    cta: { label: isKo ? '이메일 인증하기' : 'Verify email', url: ctx.verificationUrl },
  });
}

export function renderRestockAlert(ctx: RestockAlertContext): RenderedEmail {
  const locale = ctx.locale ?? 'ko';
  const isKo = locale === 'ko';
  const optionSuffix = ctx.optionLabel ? ` (${ctx.optionLabel})` : '';
  const subject = isKo
    ? `[옥화당] 재입고 알림 — ${ctx.productName}${optionSuffix}`
    : `[Ockhwadang] Restock alert — ${ctx.productName}${optionSuffix}`;
  return renderEmailLayout({
    locale,
    subject,
    eyebrow: isKo ? 'Back in stock' : 'Back in stock',
    title: isKo ? '기다리시던 상품이 재입고되었습니다' : 'Your item is back in stock',
    intro: isKo
      ? `${ctx.recipientName}님, ${ctx.productName}${optionSuffix} 상품이 다시 준비되었습니다.`
      : `Hi ${ctx.recipientName}, ${ctx.productName}${optionSuffix} is back in stock.`,
    summaryRows: [{ label: isKo ? '상품' : 'Product', value: `${ctx.productName}${optionSuffix}` }],
    cta: { label: isKo ? '상품 보러가기' : 'View product', url: ctx.productUrl },
  });
}

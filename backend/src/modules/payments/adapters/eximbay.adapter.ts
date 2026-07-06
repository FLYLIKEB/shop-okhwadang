import * as crypto from 'crypto';
import { BadGatewayException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  CancelResult,
  ConfirmResult,
  PartialCancelParams,
  PartialCancelResult,
  PaymentGateway,
  PrepareContext,
  PrepareResult,
} from '../interfaces/payment-gateway.interface';
import { PAYMENT_CONFIG, PaymentConfig } from '../../../config/payment.config';

interface EximbayReadyResponse {
  rescode?: string;
  resmsg?: string;
  fgkey?: string;
  mid?: string;
  payment?: Record<string, unknown>;
  merchant?: Record<string, unknown>;
  buyer?: Record<string, unknown>;
  url?: Record<string, unknown>;
}

interface EximbayVerifyResponse {
  rescode?: string;
  resmsg?: string;
}

interface EximbayRetrieveResponse {
  rescode?: string;
  resmsg?: string;
  payment?: {
    order_id?: string;
    currency?: string;
    amount?: string;
    transaction_id?: string;
    status?: string;
    auth_code?: string;
    transaction_date?: string;
    balance?: string;
  };
  card_info?: Record<string, unknown>;
}

interface EximbayCancelResponse {
  rescode?: string;
  resmsg?: string;
  refund?: {
    refund_id?: string;
    refund_date?: string;
    refund_transaction_id?: string;
  };
  payment?: {
    order_id?: string;
    currency?: string;
    amount?: string;
    transaction_id?: string;
    balance?: string;
  };
}

const SUCCESS_RESCODE = '0000';
const SENSITIVE_KEY_PATTERN = /(card_number|cardnumber|pan|cvc|cvv|expiry|authorization|secret|key|token)/i;

@Injectable()
export class EximbayPaymentAdapter implements PaymentGateway {
  private readonly logger = new Logger(EximbayPaymentAdapter.name);
  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly apiBaseUrl: string;
  private readonly jsSdkUrl: string;
  private readonly webhookSecret: string;
  private readonly frontendUrl: string;
  private readonly backendUrl: string;
  private readonly currency: string;
  private readonly lang: string;
  private readonly shopName: string;
  private readonly krwPerUsd: number;

  constructor(@Inject(PAYMENT_CONFIG) config: PaymentConfig) {
    this.merchantId = config.eximbay.merchantId;
    this.apiKey = config.eximbay.apiKey;
    this.secretKey = config.eximbay.secretKey;
    this.apiBaseUrl = config.eximbay.apiBaseUrl;
    this.jsSdkUrl = config.eximbay.jsSdkUrl;
    this.webhookSecret = config.eximbay.webhookSecret;
    this.frontendUrl = config.frontendUrl;
    this.backendUrl = config.backendUrl;
    this.currency = config.eximbay.currency;
    this.lang = config.eximbay.lang;
    this.shopName = config.eximbay.shopName;
    this.krwPerUsd = config.eximbay.krwPerUsd;
  }

  async prepare(orderId: string, amount: number, context?: PrepareContext): Promise<PrepareResult> {
    this.ensureConfigured();
    const locale = context?.locale === 'en' ? 'en' : 'ko';
    const orderNumber = context?.orderNumber ?? orderId;
    const payment = {
      transaction_type: 'PAYMENT',
      order_id: orderNumber,
      currency: this.currency,
      amount: this.formatAmount(amount),
      lang: this.resolveLang(locale),
      payment_method: 'P000',
    };
    const payload = {
      payment,
      merchant: {
        mid: this.merchantId,
        shop: this.shopName,
      },
      buyer: {
        name: `order_${orderId}`,
        email: `order-${orderId}@okhwadang.local`,
      },
      url: {
        return_url: `${this.frontendUrl}/${locale}/checkout/success`,
        status_url: `${this.backendUrl}/payments/webhook/eximbay`,
      },
    };

    const body = await this.eximbayFetch<EximbayReadyResponse>('/v1/payments/ready', payload);
    const fgkey = typeof body.fgkey === 'string' ? body.fgkey : undefined;
    if (body.rescode !== SUCCESS_RESCODE || !fgkey) {
      this.logger.error(`Eximbay prepare failed: orderId=${orderNumber}, rescode=${String(body.rescode)}`);
      throw new BadGatewayException('Eximbay 결제 준비 실패');
    }

    return {
      clientKey: this.merchantId,
      orderId: orderNumber,
      gatewayPayload: {
        fgkey,
        jsSdkUrl: this.jsSdkUrl,
        payment: JSON.stringify(payment),
        merchant: JSON.stringify(payload.merchant),
        buyer: JSON.stringify(payload.buyer),
        url: JSON.stringify(payload.url),
      },
    };
  }

  async confirm(paymentKey: string, amount: number, orderId: string): Promise<ConfirmResult> {
    this.ensureConfigured();
    const data = paymentKey.trim();
    if (!data) throw new BadGatewayException('Eximbay 결제 검증 데이터가 없습니다.');

    const callback = new URLSearchParams(data);
    if ((callback.get('rescode') ?? '') !== SUCCESS_RESCODE) {
      this.logger.error(`Eximbay callback declined: orderId=${orderId}, rescode=${callback.get('rescode') ?? ''}`);
      throw new BadGatewayException('Eximbay 결제 승인 실패');
    }

    const verify = await this.eximbayFetch<EximbayVerifyResponse>('/v1/payments/verify', { data });
    if (verify.rescode !== SUCCESS_RESCODE) {
      this.logger.error(`Eximbay verify failed: orderId=${orderId}, rescode=${String(verify.rescode)}`);
      throw new BadGatewayException('Eximbay 결제 검증 실패');
    }

    const transactionId = callback.get('transaction_id') ?? '';
    const callbackOrderId = callback.get('order_id') ?? orderId;
    const retrieve = await this.retrieveByOrderId(callbackOrderId, amount, transactionId);
    const payment = retrieve.payment;
    if (!payment || retrieve.rescode !== SUCCESS_RESCODE || !['SALE', 'AUTH'].includes(payment.status ?? '')) {
      this.logger.error(`Eximbay retrieve declined: orderId=${orderId}, status=${String(payment?.status)}`);
      throw new BadGatewayException('Eximbay 결제 조회 실패');
    }

    if (payment.order_id !== orderId || Number(payment.amount) !== Number(this.formatAmount(amount))) {
      this.logger.error(`Eximbay amount/order mismatch: expected=${orderId}/${amount}, actual=${payment.order_id}/${payment.amount}`);
      throw new BadGatewayException('Eximbay 결제 정보가 주문과 일치하지 않습니다.');
    }

    return {
      paymentKey: payment.transaction_id ?? transactionId,
      method: 'card',
      amount,
      status: 'confirmed',
      rawResponse: redactSensitive({ callback: Object.fromEntries(callback), retrieve }) as object,
    };
  }

  async cancel(
    paymentKey: string,
    reason: string,
    context?: Pick<PartialCancelParams, 'originalAmount' | 'orderNumber' | 'rawResponse'>,
  ): Promise<CancelResult> {
    const result = await this.partialCancel({
      paymentKey,
      cancelAmount: 0,
      cancelReason: reason,
      ...context,
    });
    return { cancelledAt: result.cancelledAt, rawResponse: result.rawResponse };
  }

  async partialCancel(params: PartialCancelParams): Promise<PartialCancelResult> {
    this.ensureConfigured();
    const retrieve = await this.resolveRefundPayment(params);
    const payment = retrieve.payment;
    if (!payment?.order_id || !payment.amount || !payment.balance) {
      throw new BadGatewayException('Eximbay 환불 대상 거래를 찾을 수 없습니다.');
    }

    const refundId = `okhwadang-${params.paymentKey}-${Date.now()}`.slice(0, 64);
    const isFull = params.cancelAmount <= 0 || Number(params.cancelAmount) >= Number(payment.balance);
    const body = await this.eximbayFetch<EximbayCancelResponse>(
      `/v1/payments/${encodeURIComponent(params.paymentKey)}/cancel`,
      {
        mid: this.merchantId,
        refund: {
          refund_type: isFull ? 'F' : 'P',
          refund_amount: isFull ? payment.balance : this.formatAmount(params.cancelAmount),
          refund_id: refundId,
          reason: params.cancelReason,
        },
        payment: {
          order_id: payment.order_id,
          currency: payment.currency ?? this.currency,
          amount: payment.amount,
          balance: payment.balance,
          lang: this.lang,
        },
      },
    );

    if (body.rescode !== SUCCESS_RESCODE) {
      this.logger.error(`Eximbay cancel failed: paymentKey=${params.paymentKey}, rescode=${String(body.rescode)}`);
      throw new BadGatewayException('Eximbay 환불 실패');
    }

    return {
      refundId: body.refund?.refund_transaction_id ?? body.refund?.refund_id ?? refundId,
      cancelledAt: parseEximbayDate(body.refund?.refund_date),
      rawResponse: redactSensitive(body) as object,
    };
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    if (!this.webhookSecret || !signature) return false;
    try {
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('base64');
      const expectedBuffer = Buffer.from(expected);
      const providedBuffer = Buffer.from(signature);
      if (expectedBuffer.length !== providedBuffer.length) return false;
      return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    } catch {
      return false;
    }
  }

  private async retrieveByOrderId(orderId: string, amount: number, transactionId?: string): Promise<EximbayRetrieveResponse> {
    return this.eximbayFetch<EximbayRetrieveResponse>('/v1/payments/retrieve', {
      mid: this.merchantId,
      key_field: 'order_id',
      payment: {
        order_id: orderId,
        currency: this.currency,
        amount: this.formatAmount(amount),
        ...(transactionId ? { transaction_id: transactionId } : {}),
        lang: this.lang,
      },
    });
  }

  private async retrieveByTransactionId(transactionId: string): Promise<EximbayRetrieveResponse> {
    return this.eximbayFetch<EximbayRetrieveResponse>('/v1/payments/retrieve', {
      mid: this.merchantId,
      key_field: 'transaction_id',
      payment: {
        transaction_id: transactionId,
        order_id: transactionId,
        currency: this.currency,
        amount: '1',
        lang: this.lang,
      },
    });
  }

  private async resolveRefundPayment(params: PartialCancelParams): Promise<EximbayRetrieveResponse> {
    const fromRaw = extractEximbayRetrieveResponse(params.rawResponse);
    if (fromRaw?.payment?.order_id && fromRaw.payment.amount && fromRaw.payment.balance) {
      return fromRaw;
    }

    if (params.orderNumber && params.originalAmount) {
      return this.retrieveByOrderId(params.orderNumber, params.originalAmount, params.paymentKey);
    }

    return this.retrieveByTransactionId(params.paymentKey);
  }

  private async eximbayFetch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.apiKey}:${this.secretKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      this.logger.error(`Eximbay API failed: path=${path}, status=${response.status}`);
      throw new BadGatewayException('Eximbay API 오류');
    }
    return (await response.json()) as T;
  }

  private ensureConfigured(): void {
    if (!this.merchantId || !this.apiKey || !this.secretKey) {
      throw new BadGatewayException('Eximbay is not configured');
    }
  }

  private resolveLang(locale: string): string {
    if (this.lang) return this.lang;
    return locale === 'ko' ? 'KR' : 'EN';
  }

  private formatAmount(amount: number): string {
    if (this.currency === 'KRW') return String(Math.round(amount));
    if (this.currency === 'USD') return (Number(amount) / this.krwPerUsd).toFixed(2);
    return String(amount);
  }
}

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : redactSensitive(item),
    ]),
  );
}

function extractEximbayRetrieveResponse(rawResponse: object | null | undefined): EximbayRetrieveResponse | null {
  if (!rawResponse || typeof rawResponse !== 'object') return null;
  const root = rawResponse as Record<string, unknown>;
  const retrieve = root.retrieve;
  if (retrieve && typeof retrieve === 'object' && !Array.isArray(retrieve)) {
    return retrieve as EximbayRetrieveResponse;
  }
  if (root.payment && typeof root.payment === 'object' && !Array.isArray(root.payment)) {
    return root as EximbayRetrieveResponse;
  }
  return null;
}

function parseEximbayDate(value: string | undefined): Date {
  if (!value || !/^\d{14}$/.test(value)) return new Date();
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}+09:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

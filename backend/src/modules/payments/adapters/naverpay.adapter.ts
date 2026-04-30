import * as crypto from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BadGatewayException } from '@nestjs/common';
import {
  PaymentGateway,
  PrepareResult,
  ConfirmResult,
  CancelResult,
  PartialCancelParams,
  PartialCancelResult,
} from '../interfaces/payment-gateway.interface';
import { PAYMENT_CONFIG, PaymentConfig } from '../../../config/payment.config';

/**
 * 네이버페이 결제 어댑터 (#721 국내 PG 어댑터 확장)
 *
 * 본 어댑터는 mock contract 수준으로, 실제 네이버페이 SDK 콜이 아닌
 * fetch 기반 HTTP 호출 형태만 잡아두었다. 실 도입 시 SDK 콜로 교체.
 *
 * - prepare: clientKey(=clientId) 반환 (FE에서 NAVER Pay JS SDK 호출에 사용)
 * - confirm: 결제 승인 요청
 * - cancel / partialCancel: 결제 취소 / 부분 취소
 * - verifyWebhook: HMAC-SHA256 (clientSecret 기반)
 */
@Injectable()
export class NaverPayPaymentAdapter implements PaymentGateway {
  private readonly logger = new Logger(NaverPayPaymentAdapter.name);
  private readonly partnerId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly chainId: string;

  constructor(
    @Inject(PAYMENT_CONFIG)
    config: PaymentConfig,
  ) {
    this.partnerId = config.naverpay.partnerId;
    this.clientId = config.naverpay.clientId;
    this.clientSecret = config.naverpay.clientSecret;
    this.chainId = config.naverpay.chainId;
  }

  private get authHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Naver-Client-Id': this.clientId,
      'X-Naver-Client-Secret': this.clientSecret,
      'X-NaverPay-Chain-Id': this.chainId,
    };
  }

  async prepare(orderId: string, _amount: number): Promise<PrepareResult> {
    return { clientKey: this.clientId, orderId };
  }

  async confirm(paymentKey: string, amount: number, orderId: string): Promise<ConfirmResult> {
    const response = await fetch(
      `https://apis.naver.com/${this.partnerId}/naverpay-partner/naverpay/payments/v2.2/apply/payment`,
      {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({
          paymentId: paymentKey,
          merchantPayKey: orderId,
          totalPayAmount: amount,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      this.logger.error(
        `NaverPay confirm failed: status=${response.status}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('네이버페이 API 오류');
    }

    const body = (await response.json()) as Record<string, unknown>;

    if (body.code !== 'Success') {
      this.logger.error(
        `NaverPay confirm declined: code=${String(body.code)}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('네이버페이 결제 승인 실패');
    }

    const detail = isRecord(body.body) ? body.body : {};
    const primary = typeof detail.primaryPayMeans === 'string' ? detail.primaryPayMeans.toLowerCase() : 'card';
    const method = primary === 'card' || primary === 'point' || primary === 'bank' ? primary : 'card';

    return {
      paymentKey,
      method,
      amount,
      status: 'confirmed',
      rawResponse: body as object,
    };
  }

  async cancel(paymentKey: string, reason: string): Promise<CancelResult> {
    const response = await fetch(
      `https://apis.naver.com/${this.partnerId}/naverpay-partner/naverpay/payments/v2.2/cancel`,
      {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({
          paymentId: paymentKey,
          cancelReason: reason,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      this.logger.error(
        `NaverPay cancel failed: status=${response.status}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('네이버페이 취소 오류');
    }

    const body = (await response.json()) as Record<string, unknown>;

    if (body.code !== 'Success') {
      this.logger.error(
        `NaverPay cancel declined: code=${String(body.code)}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('네이버페이 취소 실패');
    }

    return {
      cancelledAt: parseNaverPayCancelDateTime(body),
      rawResponse: body as object,
    };
  }

  async partialCancel(params: PartialCancelParams): Promise<PartialCancelResult> {
    const response = await fetch(
      `https://apis.naver.com/${this.partnerId}/naverpay-partner/naverpay/payments/v2.2/cancel`,
      {
        method: 'POST',
        headers: this.authHeaders,
        body: JSON.stringify({
          paymentId: params.paymentKey,
          cancelAmount: params.cancelAmount,
          cancelReason: params.cancelReason,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      this.logger.error(
        `NaverPay partialCancel failed: status=${response.status}, paymentKey=${params.paymentKey}`,
      );
      throw new BadGatewayException('네이버페이 부분 취소 오류');
    }

    const body = (await response.json()) as Record<string, unknown>;

    if (body.code !== 'Success') {
      this.logger.error(
        `NaverPay partialCancel declined: code=${String(body.code)}, paymentKey=${params.paymentKey}`,
      );
      throw new BadGatewayException('네이버페이 부분 취소 실패');
    }

    const detail = isRecord(body.body) && isRecord(body.body.cancelDetail) ? body.body.cancelDetail : null;
    const refundId = detail && typeof detail.cancelId === 'string'
      ? detail.cancelId
      : `naverpay-${params.paymentKey}-${Date.now()}`;

    return {
      refundId,
      cancelledAt: parseNaverPayCancelDateTime(body),
      rawResponse: body as object,
    };
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    try {
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expected = crypto
        .createHmac('sha256', this.clientSecret)
        .update(body)
        .digest();
      const provided = Buffer.from(signature, 'hex');
      if (expected.length !== provided.length) return false;
      return crypto.timingSafeEqual(expected, provided);
    } catch {
      return false;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNaverPayCancelDateTime(body: Record<string, unknown>): Date {
  const detail = isRecord(body.body) && isRecord(body.body.cancelDetail) ? body.body.cancelDetail : null;
  if (detail && typeof detail.cancelDateTime === 'string') {
    const parsed = new Date(detail.cancelDateTime);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

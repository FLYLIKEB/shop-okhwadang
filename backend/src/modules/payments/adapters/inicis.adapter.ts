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
 * KG이니시스 결제 어댑터 (#721 국내 PG 어댑터 확장)
 *
 * 본 어댑터는 mock contract 수준으로, 실제 KG이니시스 SDK 콜이 아닌
 * fetch 기반 HTTP 호출 형태만 잡아두었다. 실 도입 시 SDK 콜로 교체.
 *
 * - prepare: clientKey 반환 (FE에서 SDK 호출에 사용)
 * - confirm: 인증 완료된 거래의 승인 요청
 * - cancel / partialCancel: 승인 취소 / 부분 취소
 * - verifyWebhook: HMAC-SHA256 (signKey 기반)
 */
@Injectable()
export class KGInicisPaymentAdapter implements PaymentGateway {
  private readonly logger = new Logger(KGInicisPaymentAdapter.name);
  private readonly mid: string;
  private readonly signKey: string;
  private readonly apiKey: string;
  private readonly clientKey: string;

  constructor(
    @Inject(PAYMENT_CONFIG)
    config: PaymentConfig,
  ) {
    this.mid = config.inicis.mid;
    this.signKey = config.inicis.signKey;
    this.apiKey = config.inicis.apiKey;
    this.clientKey = config.inicis.clientKey;
  }

  async prepare(orderId: string, _amount: number): Promise<PrepareResult> {
    return { clientKey: this.clientKey, orderId };
  }

  async confirm(paymentKey: string, amount: number, orderId: string): Promise<ConfirmResult> {
    const response = await fetch('https://iniapi.inicis.com/v2/pg/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        type: 'Confirm',
        mid: this.mid,
        tid: paymentKey,
        price: amount,
        orderId,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      this.logger.error(
        `Inicis confirm failed: status=${response.status}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('이니시스 API 오류');
    }

    const body = (await response.json()) as Record<string, unknown>;

    if (body.resultCode !== '0000') {
      this.logger.error(
        `Inicis confirm declined: resultCode=${String(body.resultCode)}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('이니시스 결제 승인 실패');
    }

    const payMethod = typeof body.payMethod === 'string' ? body.payMethod.toLowerCase() : 'card';

    return {
      paymentKey,
      method: payMethod === 'card' || payMethod === 'vbank' || payMethod === 'bank' ? payMethod : 'card',
      amount,
      status: 'confirmed',
      rawResponse: body as object,
    };
  }

  async cancel(paymentKey: string, reason: string): Promise<CancelResult> {
    const response = await fetch('https://iniapi.inicis.com/v2/pg/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        type: 'Refund',
        mid: this.mid,
        tid: paymentKey,
        msg: reason,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      this.logger.error(
        `Inicis cancel failed: status=${response.status}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('이니시스 API 취소 오류');
    }

    const body = (await response.json()) as Record<string, unknown>;

    if (body.resultCode !== '00' && body.resultCode !== '0000') {
      this.logger.error(
        `Inicis cancel declined: resultCode=${String(body.resultCode)}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('이니시스 취소 실패');
    }

    const cancelledAt = parseInicisTimestamp(body);

    return {
      cancelledAt,
      rawResponse: body as object,
    };
  }

  async partialCancel(params: PartialCancelParams): Promise<PartialCancelResult> {
    const response = await fetch('https://iniapi.inicis.com/v2/pg/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        type: 'PartialRefund',
        mid: this.mid,
        tid: params.paymentKey,
        price: params.cancelAmount,
        msg: params.cancelReason,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      this.logger.error(
        `Inicis partialCancel failed: status=${response.status}, paymentKey=${params.paymentKey}`,
      );
      throw new BadGatewayException('이니시스 부분 취소 오류');
    }

    const body = (await response.json()) as Record<string, unknown>;

    if (body.resultCode !== '00' && body.resultCode !== '0000') {
      this.logger.error(
        `Inicis partialCancel declined: resultCode=${String(body.resultCode)}, paymentKey=${params.paymentKey}`,
      );
      throw new BadGatewayException('이니시스 부분 취소 실패');
    }

    const refundId = typeof body.cancelTid === 'string'
      ? body.cancelTid
      : `inicis-${params.paymentKey}-${Date.now()}`;

    return {
      refundId,
      cancelledAt: parseInicisTimestamp(body),
      rawResponse: body as object,
    };
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    try {
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expected = crypto
        .createHmac('sha256', this.signKey)
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

/**
 * Inicis 응답의 cancelDate(YYYYMMDD) + cancelTime(HHmmss) 를 Date로 변환.
 * 필드 누락 시 현재 시각 폴백.
 */
function parseInicisTimestamp(body: Record<string, unknown>): Date {
  const date = typeof body.cancelDate === 'string' ? body.cancelDate : null;
  const time = typeof body.cancelTime === 'string' ? body.cancelTime : null;
  if (date && time && /^\d{8}$/.test(date) && /^\d{6}$/.test(time)) {
    const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}+09:00`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

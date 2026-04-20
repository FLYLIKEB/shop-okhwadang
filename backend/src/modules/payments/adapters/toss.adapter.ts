import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { BadGatewayException } from '@nestjs/common';
import {
  PaymentGateway,
  PrepareResult,
  ConfirmResult,
  CancelResult,
  PartialCancelParams,
  PartialCancelResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class TossPaymentAdapter implements PaymentGateway {
  private readonly logger = new Logger(TossPaymentAdapter.name);

  private get secretKey(): string {
    return process.env.TOSS_SECRET_KEY ?? '';
  }

  private get clientKey(): string {
    return process.env.TOSS_CLIENT_KEY ?? '';
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`;
  }

  async prepare(orderId: string, _amount: number): Promise<PrepareResult> {
    return { clientKey: this.clientKey, orderId };
  }

  async confirm(paymentKey: string, amount: number, orderId: string): Promise<ConfirmResult> {
    const response = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey, orderId, amount }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      this.logger.error(
        `Toss confirm failed: status=${response.status}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('토스 API 오류');
    }

    const body = (await response.json()) as Record<string, unknown>;

    return {
      paymentKey,
      method: (body.method as string) ?? 'card',
      amount,
      status: 'confirmed',
      rawResponse: body as object,
    };
  }

  async cancel(paymentKey: string, reason: string): Promise<CancelResult> {
    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelReason: reason }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      this.logger.error(
        `Toss cancel failed: status=${response.status}, paymentKey=${paymentKey}`,
      );
      throw new BadGatewayException('토스 API 취소 오류');
    }

    const body = (await response.json()) as Record<string, unknown>;
    const cancels = body.cancels as Array<{ canceledAt?: string }> | undefined;

    return {
      cancelledAt: new Date(cancels?.[0]?.canceledAt ?? Date.now()),
      rawResponse: body as object,
    };
  }

  async partialCancel(params: PartialCancelParams): Promise<PartialCancelResult> {
    const response = await fetch(
      `https://api.tosspayments.com/v1/payments/${params.paymentKey}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason: params.cancelReason,
          cancelAmount: params.cancelAmount,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      this.logger.error(
        `Toss partialCancel failed: status=${response.status}, paymentKey=${params.paymentKey}`,
      );
      throw new BadGatewayException('토스 API 부분 취소 오류');
    }

    const body = (await response.json()) as Record<string, unknown>;
    const cancels = body.cancels as Array<{ canceledAt?: string }> | undefined;

    return {
      refundId: `toss-${params.paymentKey}-${Date.now()}`,
      cancelledAt: new Date(cancels?.[0]?.canceledAt ?? Date.now()),
      rawResponse: body as object,
    };
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest();
    const provided = Buffer.from(signature, 'base64');
    if (expected.length !== provided.length) return false;
    return crypto.timingSafeEqual(expected, provided);
  }
}

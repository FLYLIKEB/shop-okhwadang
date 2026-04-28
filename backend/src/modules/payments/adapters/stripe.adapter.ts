import * as crypto from 'crypto';
import Stripe from 'stripe';
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

@Injectable()
export class StripePaymentAdapter implements PaymentGateway {
  private readonly logger = new Logger(StripePaymentAdapter.name);
  private readonly stripe: Stripe | null;
  private readonly publishableKey: string;
  private readonly webhookSecret: string;

  constructor(
    @Inject(PAYMENT_CONFIG)
    config: PaymentConfig,
  ) {
    const secretKey = config.stripe.secretKey;
    this.publishableKey = config.stripe.publishableKey;
    this.webhookSecret = config.stripe.webhookSecret;
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe adapter disabled');
      this.stripe = null;
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new BadGatewayException('Stripe is not configured');
    }
    return this.stripe;
  }

  async prepare(orderId: string, amount: number): Promise<PrepareResult> {
    try {
      const paymentIntent = await this.ensureStripe().paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: { orderId },
      });

      return {
        clientKey: paymentIntent.client_secret ?? this.publishableKey,
        orderId,
      };
    } catch (err) {
      this.logger.error(
        `Stripe prepare failed: orderId=${orderId}, error=${String(err)}`,
      );
      throw new BadGatewayException('Stripe API 오류');
    }
  }

  async confirm(paymentKey: string, amount: number, orderId: string): Promise<ConfirmResult> {
    try {
      const paymentIntent = await this.ensureStripe().paymentIntents.retrieve(paymentKey);

      if (paymentIntent.status !== 'succeeded') {
        this.logger.error(
          `Stripe confirm failed: paymentKey=${paymentKey}, status=${paymentIntent.status}`,
        );
        throw new BadGatewayException('Stripe 결제 승인 실패');
      }

      const method =
        typeof paymentIntent.payment_method === 'string'
          ? 'card'
          : (paymentIntent.payment_method?.type ?? 'card');

      return {
        paymentKey,
        method,
        amount,
        status: 'confirmed',
        rawResponse: paymentIntent as unknown as object,
      };
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      this.logger.error(
        `Stripe confirm error: paymentKey=${paymentKey}, orderId=${orderId}, error=${String(err)}`,
      );
      throw new BadGatewayException('Stripe API 오류');
    }
  }

  async cancel(paymentKey: string, reason: string): Promise<CancelResult> {
    try {
      const refund = await this.ensureStripe().refunds.create({
        payment_intent: paymentKey,
        reason: 'requested_by_customer',
        metadata: { reason },
      });

      return {
        cancelledAt: new Date((refund.created ?? Date.now() / 1000) * 1000),
        rawResponse: refund as unknown as object,
      };
    } catch (err) {
      this.logger.error(
        `Stripe cancel failed: paymentKey=${paymentKey}, error=${String(err)}`,
      );
      throw new BadGatewayException('Stripe API 취소 오류');
    }
  }

  async partialCancel(params: PartialCancelParams): Promise<PartialCancelResult> {
    try {
      const refund = await this.ensureStripe().refunds.create({
        payment_intent: params.paymentKey,
        amount: params.cancelAmount,
        reason: 'requested_by_customer',
        metadata: { reason: params.cancelReason },
      });

      return {
        refundId: refund.id,
        cancelledAt: new Date((refund.created ?? Date.now() / 1000) * 1000),
        rawResponse: refund as unknown as object,
      };
    } catch (err) {
      this.logger.error(
        `Stripe partialCancel failed: paymentKey=${params.paymentKey}, error=${String(err)}`,
      );
      throw new BadGatewayException('Stripe API 부분 취소 오류');
    }
  }

  verifyWebhook(payload: unknown, signature: string): boolean {
    try {
      const body =
        typeof payload === 'string' ? payload : JSON.stringify(payload);
      const hmac = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('hex');
      const provided = Buffer.from(signature, 'hex');
      const expected = Buffer.from(hmac, 'hex');
      if (expected.length !== provided.length) return false;
      return crypto.timingSafeEqual(expected, provided);
    } catch {
      return false;
    }
  }
}

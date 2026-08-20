import Stripe from 'stripe';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { BadGatewayException } from '@nestjs/common';
import {
  PaymentGateway,
  PrepareContext,
  PrepareResult,
  ConfirmResult,
  CancelResult,
  PartialCancelParams,
  PartialCancelResult,
} from '../interfaces/payment-gateway.interface';
import { PAYMENT_CONFIG, PaymentConfig } from '../../../config/payment.config';
import {
  convertKrwToStripeUsd,
  createStripePaymentQuote,
  readStripePaymentQuote,
  allocateStripeRefundCents,
  StripeMoneyContext,
  StripeMoneyPolicyError,
} from '../stripe-money.policy';
import { verifyPaymentHmacSha256 } from '../payment-hmac.util';

@Injectable()
export class StripePaymentAdapter implements PaymentGateway {
  readonly supportsRefundIdempotency = true;
  private readonly logger = new Logger(StripePaymentAdapter.name);
  private readonly stripe: Stripe | null;
  private readonly publishableKey: string;
  private readonly webhookSecret: string;
  private readonly exchangeRate;

  constructor(
    @Inject(PAYMENT_CONFIG)
    config: PaymentConfig,
  ) {
    const secretKey = config.stripe.secretKey;
    this.publishableKey = config.stripe.publishableKey;
    this.webhookSecret = config.stripe.webhookSecret;
    this.exchangeRate = {
      krwPerUsd: config.stripe.krwPerUsd,
      krwPerUsdUpdatedAt: config.stripe.krwPerUsdUpdatedAt,
    };
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — Stripe adapter disabled');
      this.stripe = null;
    }
  }

  private ensureStripe(requirePublishableKey = false): Stripe {
    if (!this.stripe) {
      throw new BadGatewayException('Stripe is not configured');
    }
    if (requirePublishableKey && !this.publishableKey) {
      throw new BadGatewayException('Stripe cannot be exposed without a publishable key');
    }
    return this.stripe;
  }

  private convertAmount(amount: number): StripeMoneyContext {
    try {
      return convertKrwToStripeUsd(amount, this.exchangeRate);
    } catch (err) {
      if (err instanceof StripeMoneyPolicyError) {
        this.logger.error(`Stripe money policy rejected payment: ${err.message}`);
        throw new BadGatewayException('Stripe 환율 또는 결제 금액 설정이 유효하지 않습니다.');
      }
      throw err;
    }
  }

  async prepare(orderId: string, amount: number, context?: PrepareContext): Promise<PrepareResult> {
    if (context?.rawResponse) {
      try {
        const quote = readStripePaymentQuote(context.rawResponse);
        if (quote.localAmount !== amount || quote.orderNumber !== context.orderNumber) {
          throw new BadGatewayException('Stripe 결제 견적 정보가 일치하지 않습니다.');
        }
        const paymentIntent = await this.ensureStripe(true).paymentIntents.retrieve(quote.paymentIntentId);
        if (
          paymentIntent.amount !== quote.providerAmount ||
          paymentIntent.currency.toLowerCase() !== quote.providerCurrency ||
          paymentIntent.metadata.orderId !== quote.orderNumber ||
          paymentIntent.metadata.localAmount !== String(quote.localAmount) ||
          paymentIntent.metadata.localCurrency !== quote.localCurrency ||
          paymentIntent.metadata.providerAmount !== String(quote.providerAmount) ||
          paymentIntent.metadata.providerCurrency !== quote.providerCurrency ||
          paymentIntent.metadata.krwPerUsd !== quote.krwPerUsd ||
          paymentIntent.metadata.krwPerUsdUpdatedAt !== quote.krwPerUsdUpdatedAt ||
          !paymentIntent.client_secret
        ) {
          throw new BadGatewayException('저장된 Stripe PaymentIntent를 안전하게 재사용할 수 없습니다.');
        }
        return {
          clientKey: paymentIntent.client_secret,
          orderId,
          providerTransactionId: quote.paymentIntentId,
          providerOrderReference: quote.orderNumber,
          providerAmount: quote.providerAmount,
          providerCurrency: quote.providerCurrency,
          rawResponse: context.rawResponse,
        };
      } catch (err) {
        if (err instanceof StripeMoneyPolicyError) {
          throw new BadGatewayException('Stripe 결제 견적 정보가 유효하지 않습니다.');
        }
        throw err;
      }
    }
    const money = this.convertAmount(amount);
    if (!context?.orderNumber) {
      throw new BadGatewayException('Stripe 주문 참조가 없습니다.');
    }
    try {
      const paymentIntentParams = {
        amount: money.providerAmount,
        currency: money.providerCurrency,
        metadata: {
          orderId: context.orderNumber,
          localAmount: String(money.localAmount),
          localCurrency: money.localCurrency,
          providerAmount: String(money.providerAmount),
          providerCurrency: money.providerCurrency,
          krwPerUsd: money.krwPerUsd,
          krwPerUsdUpdatedAt: money.krwPerUsdUpdatedAt,
        },
      };
      const stripe = this.ensureStripe(true);
      const paymentIntent = context?.idempotencyKey
        ? await stripe.paymentIntents.create(paymentIntentParams, { idempotencyKey: context.idempotencyKey })
        : await stripe.paymentIntents.create(paymentIntentParams);
      if (!paymentIntent.client_secret) {
        throw new BadGatewayException('Stripe PaymentIntent cannot be safely exposed');
      }
      if (
        paymentIntent.amount !== money.providerAmount ||
        paymentIntent.currency.toLowerCase() !== money.providerCurrency ||
        paymentIntent.metadata.orderId !== context.orderNumber ||
        paymentIntent.metadata.localAmount !== String(money.localAmount) ||
        paymentIntent.metadata.localCurrency !== money.localCurrency ||
        paymentIntent.metadata.providerAmount !== String(money.providerAmount) ||
        paymentIntent.metadata.providerCurrency !== money.providerCurrency ||
        paymentIntent.metadata.krwPerUsd !== money.krwPerUsd ||
        paymentIntent.metadata.krwPerUsdUpdatedAt !== money.krwPerUsdUpdatedAt
      ) {
        throw new BadGatewayException('Stripe PaymentIntent 견적이 일치하지 않습니다.');
      }
      const quote = createStripePaymentQuote(
        amount,
        this.exchangeRate,
        context.orderNumber,
        paymentIntent.id,
      );

      return {
        clientKey: paymentIntent.client_secret,
        orderId,
        providerTransactionId: paymentIntent.id,
        providerOrderReference: context.orderNumber,
        providerAmount: money.providerAmount,
        providerCurrency: money.providerCurrency,
        rawResponse: { stripeQuote: quote },
      };
    } catch (err) {
      this.logger.error(
        `Stripe prepare failed: orderId=${orderId}, error=${String(err)}`,
      );
      throw new BadGatewayException('Stripe API 오류');
    }
  }

  async confirm(paymentKey: string, amount: number, orderId: string, context?: { rawResponse?: object | null }): Promise<ConfirmResult> {
    let quote;
    try {
      quote = readStripePaymentQuote(context?.rawResponse);
    } catch (err) {
      if (err instanceof StripeMoneyPolicyError) {
        throw new BadGatewayException('Stripe 결제 견적 정보가 유효하지 않습니다.');
      }
      throw err;
    }
    if (quote.localAmount !== amount || quote.orderNumber !== orderId || quote.paymentIntentId !== paymentKey) {
      throw new BadGatewayException('Stripe 결제 견적 정보가 일치하지 않습니다.');
    }
    try {
      const paymentIntent = await this.ensureStripe().paymentIntents.retrieve(paymentKey);

      if (
        paymentIntent.amount !== quote.providerAmount ||
        paymentIntent.amount_received !== quote.providerAmount ||
        paymentIntent.currency.toLowerCase() !== quote.providerCurrency ||
        paymentIntent.metadata.orderId !== orderId ||
        paymentIntent.metadata.localAmount !== String(quote.localAmount) ||
        paymentIntent.metadata.localCurrency !== quote.localCurrency ||
        paymentIntent.metadata.providerAmount !== String(quote.providerAmount) ||
        paymentIntent.metadata.providerCurrency !== quote.providerCurrency ||
        paymentIntent.metadata.krwPerUsd !== quote.krwPerUsd ||
        paymentIntent.metadata.krwPerUsdUpdatedAt !== quote.krwPerUsdUpdatedAt
      ) {
        this.logger.error(`Stripe confirm amount or currency mismatch: paymentKey=${paymentKey}, orderId=${orderId}`);
        throw new BadGatewayException('Stripe 결제 금액 또는 통화가 일치하지 않습니다.');
      }

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
        providerTransactionId: paymentIntent.id,
        providerOrderReference: paymentIntent.metadata.orderId,
        providerAmount: paymentIntent.amount_received,
        providerCurrency: paymentIntent.currency,
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

  async cancel(paymentKey: string, reason: string, context?: Pick<PartialCancelParams, 'originalAmount' | 'rawResponse'>): Promise<CancelResult> {
    try {
      const quote = readStripePaymentQuote(context?.rawResponse);
      const refund = await this.ensureStripe().refunds.create({
        payment_intent: paymentKey,
        amount: allocateStripeRefundCents(quote, 0, quote.localAmount),
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
      const quote = readStripePaymentQuote(params.rawResponse);
      const providerAmount = params.providerRefundAmount ?? allocateStripeRefundCents(
        quote,
        params.priorRefundedAmount ?? 0,
        params.cancelAmount,
      );
      if (!Number.isSafeInteger(providerAmount) || providerAmount <= 0) {
        throw new BadGatewayException('Stripe 환불 금액이 유효하지 않습니다.');
      }
      const refundParams = {
        payment_intent: params.paymentKey,
        amount: providerAmount,
        reason: 'requested_by_customer' as const,
        metadata: { reason: params.cancelReason },
      };
      const refund = params.idempotencyKey
        ? await this.ensureStripe().refunds.create(
          refundParams,
          { idempotencyKey: params.idempotencyKey },
        )
        : await this.ensureStripe().refunds.create(refundParams);

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
    return verifyPaymentHmacSha256(payload, signature, {
      secret: this.webhookSecret,
      signatureEncoding: 'hex',
    });
  }
}

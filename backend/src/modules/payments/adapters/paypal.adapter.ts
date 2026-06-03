import { Inject, Injectable, Logger, BadGatewayException } from '@nestjs/common';
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

interface PayPalLink {
  rel?: string;
  href?: string;
}

interface PayPalWebhookHeaders {
  auth_algo?: string;
  cert_url?: string;
  transmission_id?: string;
  transmission_sig?: string;
  transmission_time?: string;
}

interface PayPalOrderResponse {
  id?: string;
  status?: string;
  links?: PayPalLink[];
  create_time?: string;
  update_time?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{ id?: string }>;
    };
  }>;
}

@Injectable()
export class PayPalPaymentAdapter implements PaymentGateway {
  private readonly logger = new Logger(PayPalPaymentAdapter.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookId: string;
  private readonly apiBaseUrl: string;
  private readonly frontendUrl: string;

  constructor(@Inject(PAYMENT_CONFIG) config: PaymentConfig) {
    this.clientId = config.paypal.clientId;
    this.clientSecret = config.paypal.clientSecret;
    this.webhookId = config.paypal.webhookId;
    this.apiBaseUrl = config.paypal.apiBaseUrl;
    this.frontendUrl = config.frontendUrl;
  }

  async prepare(orderId: string, amount: number, context?: PrepareContext): Promise<PrepareResult> {
    const locale = context?.locale ?? 'en';
    const accessToken = await this.getAccessToken();
    const response = await this.paypalFetch('/v2/checkout/orders', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: orderId,
            amount: {
              currency_code: 'USD',
              value: formatPayPalAmount(amount),
            },
          },
        ],
        application_context: {
          user_action: 'PAY_NOW',
          return_url: `${this.frontendUrl}/${locale}/checkout/success`,
          cancel_url: `${this.frontendUrl}/${locale}/checkout/fail`,
        },
      }),
    });
    const body = await readJson<PayPalOrderResponse>(response);
    const paypalOrderId = body.id;
    const redirectUrl = body.links?.find((link) => link.rel === 'approve')?.href;

    if (!paypalOrderId || !redirectUrl) {
      this.logger.error(`PayPal prepare failed: missing approval link, orderId=${orderId}`);
      throw new BadGatewayException('PayPal 결제 준비 실패');
    }

    return {
      clientKey: this.clientId,
      orderId: paypalOrderId,
      redirectUrl,
    };
  }

  async confirm(paymentKey: string, amount: number, orderId: string): Promise<ConfirmResult> {
    const accessToken = await this.getAccessToken();
    const response = await this.paypalFetch(
      `/v2/checkout/orders/${encodeURIComponent(paymentKey)}/capture`,
      accessToken,
      { method: 'POST' },
    );
    const body = await readJson<PayPalOrderResponse>(response);

    if (body.status !== 'COMPLETED') {
      this.logger.error(
        `PayPal capture declined: paymentKey=${paymentKey}, orderId=${orderId}, status=${String(body.status)}`,
      );
      throw new BadGatewayException('PayPal 결제 승인 실패');
    }

    return {
      paymentKey,
      method: 'paypal',
      amount,
      status: 'confirmed',
      rawResponse: body as object,
    };
  }

  async cancel(paymentKey: string, reason: string): Promise<CancelResult> {
    const result = await this.partialCancel({
      paymentKey,
      cancelAmount: 0,
      cancelReason: reason,
    });
    return {
      cancelledAt: result.cancelledAt,
      rawResponse: result.rawResponse,
    };
  }

  async partialCancel(params: PartialCancelParams): Promise<PartialCancelResult> {
    const accessToken = await this.getAccessToken();
    const captureId = await this.findCaptureId(params.paymentKey, accessToken);
    const payload: Record<string, unknown> = {
      note_to_payer: params.cancelReason,
    };
    if (params.cancelAmount > 0) {
      payload.amount = {
        currency_code: 'USD',
        value: formatPayPalAmount(params.cancelAmount),
      };
    }

    const response = await this.paypalFetch(
      `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    const body = await readJson<Record<string, unknown>>(response);
    const refundId = typeof body.id === 'string' ? body.id : `paypal-${params.paymentKey}-${Date.now()}`;
    const createdAt = typeof body.create_time === 'string' ? new Date(body.create_time) : new Date();

    return {
      refundId,
      cancelledAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
      rawResponse: body as object,
    };
  }

  async verifyWebhook(payload: unknown, signature: string): Promise<boolean> {
    if (!this.webhookId || !signature || !isRecord(payload)) return false;

    let headers: PayPalWebhookHeaders;
    try {
      headers = JSON.parse(signature) as PayPalWebhookHeaders;
    } catch {
      return false;
    }

    if (
      !headers.auth_algo
      || !headers.cert_url
      || !headers.transmission_id
      || !headers.transmission_sig
      || !headers.transmission_time
    ) {
      return false;
    }

    try {
      const accessToken = await this.getAccessToken();
      const response = await this.paypalFetch(
        '/v1/notifications/verify-webhook-signature',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            ...headers,
            webhook_id: this.webhookId,
            webhook_event: payload,
          }),
        },
      );
      const body = await readJson<Record<string, unknown>>(response);
      return body.verification_status === 'SUCCESS';
    } catch (err) {
      this.logger.error(`PayPal webhook verification failed: ${String(err)}`);
      return false;
    }
  }

  private async findCaptureId(orderId: string, accessToken: string): Promise<string> {
    const response = await this.paypalFetch(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
      accessToken,
      { method: 'GET' },
    );
    const body = await readJson<PayPalOrderResponse>(response);
    const captureId = body.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    if (!captureId) {
      this.logger.error(`PayPal refund failed: capture id not found, orderId=${orderId}`);
      throw new BadGatewayException('PayPal 환불 대상 거래를 찾을 수 없습니다.');
    }
    return captureId;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadGatewayException('PayPal is not configured');
    }
    const token = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(`${this.apiBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      this.logger.error(`PayPal token failed: status=${response.status}`);
      throw new BadGatewayException('PayPal 인증 오류');
    }
    const body = await readJson<Record<string, unknown>>(response);
    if (typeof body.access_token !== 'string') {
      throw new BadGatewayException('PayPal 인증 응답 오류');
    }
    return body.access_token;
  }

  private async paypalFetch(path: string, accessToken: string, init: RequestInit): Promise<Response> {
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
      signal: init.signal ?? AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      this.logger.error(`PayPal API failed: path=${path}, status=${response.status}`);
      throw new BadGatewayException('PayPal API 오류');
    }
    return response;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function formatPayPalAmount(amount: number): string {
  return Number(amount).toFixed(2);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

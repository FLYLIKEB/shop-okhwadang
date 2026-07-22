import { apiClient, type RequestOptions } from './core';

export type CheckoutGatewayName = 'naverpay' | 'bank_transfer' | 'eximbay' | 'paypal';

export interface PreparePaymentResponse {
  paymentId: number;
  orderId: number;
  orderNumber: string;
  amount: number;
  gateway: string;
  clientKey: string;
  availableGateways?: string[];
  redirectUrl?: string;
  gatewayPayload?: Record<string, string | number | boolean>;
}

export interface ConfirmPaymentResponse {
  paymentId: number;
  orderId: number;
  orderNumber: string;
  status: string;
  method: string;
  amount: number;
  paidAt: string;
}

export interface GuestConfirmPaymentResponse extends ConfirmPaymentResponse {
  guestAccessToken: string;
  guestAccessTokenExpiresAt: string;
}

function createGuestRequestOptions(
  guestAccessToken: string,
  options?: RequestOptions,
): RequestOptions {
  return {
    ...options,
    skipAuthRefresh: true,
    headers: {
      ...(options?.headers as Record<string, string> | undefined),
      'X-Guest-Access-Token': guestAccessToken,
    },
  };
}

export const paymentsApi = {
  prepare: (
    body: { orderId: number; locale?: string; gateway?: CheckoutGatewayName },
    options?: RequestOptions,
  ) => apiClient.post<PreparePaymentResponse>('/payments/prepare', body, options),
  confirm: (body: { orderId: number; paymentKey: string; amount: number }, options?: RequestOptions) =>
    apiClient.post<ConfirmPaymentResponse>('/payments/confirm', body, options),
};

export const guestPaymentsApi = {
  prepare: (
    orderId: number,
    body: { locale?: string; gateway?: CheckoutGatewayName },
    guestAccessToken: string,
    options?: RequestOptions,
  ) =>
    apiClient.post<PreparePaymentResponse>(
      `/guest/orders/${orderId}/payments/prepare`,
      body,
      createGuestRequestOptions(guestAccessToken, options),
    ),
  confirm: (
    orderId: number,
    body: { paymentKey: string; amount: number },
    guestAccessToken: string,
    options?: RequestOptions,
  ) =>
    apiClient.post<GuestConfirmPaymentResponse>(
      `/guest/orders/${orderId}/payments/confirm`,
      body,
      createGuestRequestOptions(guestAccessToken, options),
    ),
};

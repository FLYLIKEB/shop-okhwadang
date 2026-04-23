import { apiClient, type RequestOptions } from './core';

export interface PreparePaymentResponse {
  paymentId: number;
  orderId: number;
  orderNumber: string;
  amount: number;
  gateway: string;
  clientKey: string;
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

export const paymentsApi = {
  prepare: (body: { orderId: number; locale?: string }, options?: RequestOptions) =>
    apiClient.post<PreparePaymentResponse>('/payments/prepare', body, options),
  confirm: (body: { orderId: number; paymentKey: string; amount: number }, options?: RequestOptions) =>
    apiClient.post<ConfirmPaymentResponse>('/payments/confirm', body, options),
};

export interface PrepareContext {
  locale?: string;
  orderNumber?: string;
  idempotencyKey?: string;
  rawResponse?: object | null;
}

export interface ConfirmContext {
  idempotencyKey?: string;
  rawResponse?: object | null;
}

export interface PrepareResult {
  clientKey: string;
  orderId: string;
  redirectUrl?: string;
  gatewayPayload?: Record<string, string | number | boolean>;
  rawResponse?: object;
}

export interface ConfirmResult {
  paymentKey: string;
  method: string;
  amount: number;
  status: string;
  rawResponse: object;
}

export interface CancelResult {
  cancelledAt: Date;
  rawResponse: object;
}

export interface PartialCancelParams {
  paymentKey: string;
  cancelAmount: number;
  cancelReason: string;
  idempotencyKey?: string;
  originalAmount?: number;
  priorRefundedAmount?: number;
  providerRefundAmount?: number;
  orderNumber?: string;
  rawResponse?: object | null;
}

export interface PartialCancelResult {
  refundId: string;
  cancelledAt: Date;
  rawResponse: object;
}

export interface PaymentGateway {
  readonly supportsRefundIdempotency?: boolean;
  prepare(orderId: string, amount: number, context?: PrepareContext): Promise<PrepareResult>;
  confirm(paymentKey: string, amount: number, orderId: string, context?: ConfirmContext): Promise<ConfirmResult>;
  cancel(paymentKey: string, reason: string, context?: Pick<PartialCancelParams, 'originalAmount' | 'orderNumber' | 'rawResponse'>): Promise<CancelResult>;
  partialCancel(params: PartialCancelParams): Promise<PartialCancelResult>;
  verifyWebhook(payload: unknown, signature: string): boolean | Promise<boolean>;
}

export interface PrepareResult {
  clientKey: string;
  orderId: string;
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

export interface PaymentGateway {
  prepare(orderId: string, amount: number): Promise<PrepareResult>;
  confirm(paymentKey: string, amount: number, orderId: string): Promise<ConfirmResult>;
  cancel(paymentKey: string, reason: string): Promise<CancelResult>;
  verifyWebhook(payload: unknown, signature: string): boolean;
}

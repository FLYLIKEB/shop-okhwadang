import { Injectable } from '@nestjs/common';
import { PaymentGateway, PrepareResult, ConfirmResult, CancelResult } from '../interfaces/payment-gateway.interface';

@Injectable()
export class MockPaymentAdapter implements PaymentGateway {
  async prepare(orderId: string, _amount: number): Promise<PrepareResult> {
    return { clientKey: 'mock_client_key', orderId };
  }

  async confirm(paymentKey: string, amount: number, _orderId: string): Promise<ConfirmResult> {
    if (paymentKey.startsWith('fail_')) {
      throw new Error('Mock payment failed');
    }
    return {
      paymentKey,
      method: 'mock',
      amount,
      status: 'confirmed',
      rawResponse: { mock: true } as object,
    };
  }

  async cancel(paymentKey: string, reason: string): Promise<CancelResult> {
    return { cancelledAt: new Date(), rawResponse: { mock: true, reason, paymentKey } as object };
  }

  verifyWebhook(_payload: unknown, _signature: string): boolean {
    return true;
  }
}

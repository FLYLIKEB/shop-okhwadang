import { ConflictException, Injectable } from '@nestjs/common';
import { GuestPreparePaymentDto } from './dto/guest-prepare-payment.dto';
import { GuestConfirmPaymentDto } from './dto/guest-confirm-payment.dto';
import { PaymentsService } from './payments.service';
import { PaymentConfirmationService } from './services/payment-confirmation.service';
import { createHash } from 'crypto';
import { IdempotencyService } from '../../common/services/idempotency.service';

@Injectable()
export class GuestPaymentsService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentConfirmationService: PaymentConfirmationService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async prepare(orderId: number, dto: GuestPreparePaymentDto, guestAccessToken: string, idempotencyKey?: string) {
    return (await this.idempotencyService.execute(
      this.guestScope(guestAccessToken),
      'guest-payment.prepare',
      idempotencyKey,
      { orderId, ...dto },
      async () => {
        await this.paymentConfirmationService.assertGuestAccessTokenActive(orderId, guestAccessToken);
        return this.paymentsService.prepareForOrder(orderId, {
          locale: dto.locale,
          gateway: dto.gateway,
          idempotencyKey,
        });
      },
    )).result;
  }

  async confirm(orderId: number, dto: GuestConfirmPaymentDto, guestAccessToken: string, idempotencyKey?: string) {
    const operation = await this.idempotencyService.reserve(
      this.guestScope(guestAccessToken),
      'guest-payment.confirm',
      idempotencyKey,
      { routeOrderId: orderId, dto },
    );
    if (operation.replayed) return operation.result;
    if (!operation.owner) throw new ConflictException('동일한 요청이 처리 중입니다.');
    await this.idempotencyService.renewLease(operation.id, operation.leaseOwner!);
    return this.paymentConfirmationService.confirmGuest(
      orderId,
      dto,
      guestAccessToken,
      idempotencyKey,
      (manager, response) => this.idempotencyService.complete(manager, operation.id, operation.leaseOwner!, response),
    );
  }

  private guestScope(guestAccessToken: string): string {
    return `guest-token:${createHash('sha256').update(guestAccessToken).digest('hex')}`;
  }
}

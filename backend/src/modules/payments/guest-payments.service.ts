import { Injectable } from '@nestjs/common';
import { GuestPreparePaymentDto } from './dto/guest-prepare-payment.dto';
import { GuestConfirmPaymentDto } from './dto/guest-confirm-payment.dto';
import { PaymentsService } from './payments.service';
import { PaymentConfirmationService } from './services/payment-confirmation.service';

@Injectable()
export class GuestPaymentsService {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentConfirmationService: PaymentConfirmationService,
  ) {}

  async prepare(orderId: number, dto: GuestPreparePaymentDto, guestAccessToken: string) {
    await this.paymentConfirmationService.assertGuestAccessTokenActive(orderId, guestAccessToken);

    return this.paymentsService.prepareForOrder(orderId, {
      locale: dto.locale,
      gateway: dto.gateway,
    });
  }

  async confirm(orderId: number, dto: GuestConfirmPaymentDto, guestAccessToken: string) {
    return this.paymentConfirmationService.confirmGuest(orderId, dto, guestAccessToken);
  }
}

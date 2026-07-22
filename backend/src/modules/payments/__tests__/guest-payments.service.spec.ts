import { GuestPaymentsService } from '../guest-payments.service';
import { PaymentsService } from '../payments.service';
import { PaymentConfirmationService } from '../services/payment-confirmation.service';

describe('GuestPaymentsService', () => {
  let service: GuestPaymentsService;
  let paymentsService: {
    prepareForOrder: jest.Mock;
  };
  let paymentConfirmationService: {
    assertGuestAccessTokenActive: jest.Mock;
    confirmGuest: jest.Mock;
  };

  beforeEach(() => {
    paymentsService = {
      prepareForOrder: jest.fn().mockResolvedValue({ checkoutId: 'checkout-1' }),
    };
    paymentConfirmationService = {
      assertGuestAccessTokenActive: jest.fn().mockResolvedValue(undefined),
      confirmGuest: jest.fn().mockResolvedValue({ ok: true }),
    };

    service = new GuestPaymentsService(
      paymentsService as unknown as PaymentsService,
      paymentConfirmationService as unknown as PaymentConfirmationService,
    );
  });

  it('verifies the guest access token before preparing payment', async () => {
    await expect(
      service.prepare(33, { locale: 'en', gateway: 'paypal' }, 'guest-access-token'),
    ).resolves.toEqual({ checkoutId: 'checkout-1' });

    expect(paymentConfirmationService.assertGuestAccessTokenActive).toHaveBeenCalledWith(33, 'guest-access-token');
    expect(paymentsService.prepareForOrder).toHaveBeenCalledWith(33, {
      locale: 'en',
      gateway: 'paypal',
    });
  });

  it('delegates guest confirmation to the confirmation service', async () => {
    const dto = {
      paymentKey: 'payment-key',
      orderId: 'external-order-id',
      amount: 18000,
      gateway: 'paypal',
    };

    await expect(service.confirm(33, dto, 'guest-access-token')).resolves.toEqual({ ok: true });
    expect(paymentConfirmationService.confirmGuest).toHaveBeenCalledWith(33, dto, 'guest-access-token');
  });
});

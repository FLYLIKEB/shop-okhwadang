import { GuestPaymentsService } from '../guest-payments.service';
import { PaymentsService } from '../payments.service';
import { PaymentConfirmationService } from '../services/payment-confirmation.service';
import { IdempotencyService } from '../../../common/services/idempotency.service';

describe('GuestPaymentsService', () => {
  let service: GuestPaymentsService;
  let paymentsService: { prepareForOrder: jest.Mock };
  let paymentConfirmationService: { assertGuestAccessTokenActive: jest.Mock; confirmGuest: jest.Mock };
  let idempotencyService: { execute: jest.Mock; reserve: jest.Mock; complete: jest.Mock; renewLease: jest.Mock };

  beforeEach(() => {
    paymentsService = { prepareForOrder: jest.fn().mockResolvedValue({ checkoutId: 'checkout-1' }) };
    paymentConfirmationService = {
      assertGuestAccessTokenActive: jest.fn().mockResolvedValue(undefined),
      confirmGuest: jest.fn().mockResolvedValue({ ok: true }),
    };
    idempotencyService = {
      execute: jest.fn(async (_scope, _operation, _key, _payload, work) => ({ result: await work(), replayed: false })),
      reserve: jest.fn().mockResolvedValue({ id: 1, owner: true, replayed: false }),
      complete: jest.fn().mockResolvedValue(undefined),
      renewLease: jest.fn().mockResolvedValue(undefined),
    };
    service = new GuestPaymentsService(
      paymentsService as unknown as PaymentsService,
      paymentConfirmationService as unknown as PaymentConfirmationService,
      idempotencyService as unknown as IdempotencyService,
    );
  });

  it('uses a hashed guest-token scope and replays payment preparation through the operation service', async () => {
    await expect(service.prepare(33, { locale: 'en', gateway: 'paypal' }, 'guest-access-token', 'prepare-key'))
      .resolves.toEqual({ checkoutId: 'checkout-1' });
    expect(paymentConfirmationService.assertGuestAccessTokenActive).toHaveBeenCalledWith(33, 'guest-access-token');
    expect(paymentsService.prepareForOrder).toHaveBeenCalledWith(33, {
      locale: 'en',
      gateway: 'paypal',
      idempotencyKey: 'prepare-key',
    });
    expect(idempotencyService.execute).toHaveBeenCalledWith(
      expect.stringMatching(/^guest-token:[a-f0-9]{64}$/), 'guest-payment.prepare', 'prepare-key',
      { orderId: 33, locale: 'en', gateway: 'paypal' }, expect.any(Function),
    );
  });

  it('delegates guest confirmation through the idempotency operation', async () => {
    const dto = { paymentKey: 'payment-key', orderId: 'external-order-id', amount: 18000, gateway: 'paypal' };
    await expect(service.confirm(33, dto, 'guest-access-token', 'confirm-key')).resolves.toEqual({ ok: true });
    expect(paymentConfirmationService.confirmGuest).toHaveBeenCalledWith(
      33,
      dto,
      'guest-access-token',
      'confirm-key',
      expect.any(Function),
    );
    expect(idempotencyService.reserve).toHaveBeenCalledWith(
      expect.stringMatching(/^guest-token:[a-f0-9]{64}$/), 'guest-payment.confirm', 'confirm-key',
      { routeOrderId: 33, dto },
    );
  });
});

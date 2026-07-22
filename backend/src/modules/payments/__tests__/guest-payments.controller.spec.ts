import { UnauthorizedException } from '@nestjs/common';
import { GuestPaymentsController } from '../guest-payments.controller';
import { GuestPaymentsService } from '../guest-payments.service';

describe('GuestPaymentsController', () => {
  let controller: GuestPaymentsController;
  let guestPaymentsService: {
    prepare: jest.Mock;
    confirm: jest.Mock;
  };

  beforeEach(() => {
    guestPaymentsService = {
      prepare: jest.fn().mockResolvedValue({ checkoutId: 'checkout-1' }),
      confirm: jest.fn().mockResolvedValue({ ok: true }),
    };

    controller = new GuestPaymentsController(guestPaymentsService as unknown as GuestPaymentsService);
  });

  it('uses the first trimmed guest token from lowercase header arrays for prepare', async () => {
    const dto = { locale: 'ko', gateway: 'naverpay' };

    await expect(
      controller.prepare(7, dto as never, { 'x-guest-access-token': [' guest-token ', 'ignored'] }),
    ).resolves.toEqual({ checkoutId: 'checkout-1' });

    expect(guestPaymentsService.prepare).toHaveBeenCalledWith(7, dto, 'guest-token');
  });

  it('accepts uppercase guest token headers for confirm', async () => {
    const dto = { paymentKey: 'key', orderId: 'external-order-id', amount: 18000, gateway: 'paypal' };

    await expect(
      controller.confirm(7, dto as never, { 'X-Guest-Access-Token': ' upper-token ' }),
    ).resolves.toEqual({ ok: true });

    expect(guestPaymentsService.confirm).toHaveBeenCalledWith(7, dto, 'upper-token');
  });

  it('rejects prepare requests without a usable guest token header', async () => {
    await expect(
      Promise.resolve().then(() => controller.prepare(7, {} as never, { 'x-guest-access-token': '   ' })),
    ).rejects.toThrow(UnauthorizedException);
    expect(guestPaymentsService.prepare).not.toHaveBeenCalled();
  });
});

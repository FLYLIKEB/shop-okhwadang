import { ConflictException } from '@nestjs/common';
import { CartController } from '../cart.controller';
import { CartService, CartResponse } from '../cart.service';
import { IdempotencyService } from '../../../common/services/idempotency.service';

describe('CartController', () => {
  const user = { id: 7 } as never;
  const dto = { productId: 10, productOptionId: null, quantity: 2 };
  const cartResponse: CartResponse = { items: [], totalAmount: 20000, itemCount: 2 };
  let controller: CartController;
  let cartService: { add: jest.Mock };
  let idempotencyService: { execute: jest.Mock };

  beforeEach(() => {
    cartService = { add: jest.fn().mockResolvedValue(cartResponse) };
    idempotencyService = { execute: jest.fn() };
    controller = new CartController(
      cartService as unknown as CartService,
      idempotencyService as unknown as IdempotencyService,
    );
  });

  it('uses the legacy cart add path without an Idempotency-Key', async () => {
    await expect(controller.add(user, dto, 'ko')).resolves.toEqual(cartResponse);

    expect(cartService.add).toHaveBeenCalledWith(7, dto, 'ko');
    expect(idempotencyService.execute).not.toHaveBeenCalled();
  });

  it('replays an identical key without invoking the cart mutation again', async () => {
    let stored: CartResponse | undefined;
    const manager = {};
    idempotencyService.execute.mockImplementation(async (
      _scope: string,
      _operation: string,
      _key: string,
      _payload: unknown,
      work: (transactionManager: unknown) => Promise<CartResponse>,
    ) => {
      if (stored) return { result: stored, replayed: true };
      stored = await work(manager);
      return { result: stored, replayed: false };
    });

    await expect(controller.add(user, dto, undefined, 'retry-key')).resolves.toEqual(cartResponse);
    await expect(controller.add(user, dto, undefined, 'retry-key')).resolves.toEqual(cartResponse);

    expect(idempotencyService.execute).toHaveBeenCalledWith(
      'user:7', 'cart-add', 'retry-key', dto, expect.any(Function),
    );
    expect(cartService.add).toHaveBeenCalledTimes(1);
    expect(cartService.add).toHaveBeenCalledWith(7, dto, undefined, manager);
  });

  it('does not mutate the cart when the idempotency service rejects a changed payload', async () => {
    idempotencyService.execute.mockRejectedValue(
      new ConflictException('동일한 Idempotency-Key에 다른 요청을 사용할 수 없습니다.'),
    );

    await expect(controller.add(user, { ...dto, quantity: 3 }, undefined, 'retry-key')).rejects.toThrow(ConflictException);

    expect(cartService.add).not.toHaveBeenCalled();
  });
});

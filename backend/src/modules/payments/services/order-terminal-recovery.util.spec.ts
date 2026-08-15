import { EntityManager } from 'typeorm';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { UserCoupon } from '../../coupons/entities/user-coupon.entity';
import { runFirstTerminalTransitionRecovery } from './order-terminal-recovery.util';
import { restoreOrderStock } from '../../orders/order-stock.util';

jest.mock('../../orders/order-stock.util', () => ({
  restoreOrderStock: jest.fn(),
}));

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 10,
    userId: 7,
    pointsUsed: 400,
    status: OrderStatus.PENDING,
    ...overrides,
  }) as Order;

describe('runFirstTerminalTransitionRecovery', () => {
  const restoreOrderStockMock = restoreOrderStock as jest.MockedFunction<typeof restoreOrderStock>;
  let manager: { findOne: jest.Mock; update: jest.Mock };
  let pointsService: { lockUserForPointChanges: jest.Mock; creditFifo: jest.Mock };

  beforeEach(() => {
    manager = { findOne: jest.fn(), update: jest.fn() };
    pointsService = { lockUserForPointChanges: jest.fn(), creditFifo: jest.fn() };
    restoreOrderStockMock.mockResolvedValue(undefined);
  });

  it('locks the member before the order, revalidates it, and restores exactly one non-expiring admin lot', async () => {
    const candidate = makeOrder();
    const lockedOrder = makeOrder();
    const events: string[] = [];
    manager.findOne
      .mockImplementationOnce(async () => {
        events.push('candidate');
        return candidate;
      })
      .mockImplementationOnce(async (_entity, options) => {
        events.push('order-lock');
        expect(options).toEqual({ where: { id: 10 }, lock: { mode: 'pessimistic_write' } });
        return lockedOrder;
      });
    pointsService.lockUserForPointChanges.mockImplementation(async () => {
      events.push('user-lock');
    });
    pointsService.creditFifo.mockResolvedValue({ id: 1 });

    await expect(
      runFirstTerminalTransitionRecovery(manager as unknown as EntityManager, {
        orderId: 10,
        nextOrderStatus: OrderStatus.CANCELLED,
        pointsService,
        pointRestoreDescription: 'restore',
        lockBeforeRecovery: async () => {
          events.push('payment-lock');
          return true;
        },
        applyMutations: async () => {
          events.push('mutate');
          return true;
        },
      }),
    ).resolves.toMatchObject({ lockedOrder, didMutate: true, didRestore: true });

    expect(events).toEqual(['candidate', 'user-lock', 'order-lock', 'payment-lock', 'mutate']);
    expect(manager.update).toHaveBeenCalledWith(
      UserCoupon,
      { orderId: 10, status: 'used' },
      { status: 'available', usedAt: null, orderId: null },
    );
    expect(pointsService.creditFifo).toHaveBeenCalledTimes(1);
    expect(pointsService.creditFifo).toHaveBeenCalledWith(
      manager,
      7,
      400,
      'restore',
      null,
      10,
      null,
      null,
      'admin_adjust',
    );
  });

  it('aborts after the user lock when the reloaded order is already terminal', async () => {
    manager.findOne
      .mockResolvedValueOnce(makeOrder())
      .mockResolvedValueOnce(makeOrder({ status: OrderStatus.CANCELLED }));

    await expect(
      runFirstTerminalTransitionRecovery(manager as unknown as EntityManager, {
        orderId: 10,
        nextOrderStatus: OrderStatus.CANCELLED,
        pointsService,
        pointRestoreDescription: 'restore',
        applyMutations: jest.fn(),
      }),
    ).resolves.toMatchObject({ didMutate: false, didRestore: false });

    expect(pointsService.lockUserForPointChanges).toHaveBeenCalledWith(manager, 7);
    expect(pointsService.creditFifo).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });

  it.each([
    ['guest', makeOrder({ userId: null, pointsUsed: 400 })],
    ['no-points', makeOrder({ pointsUsed: 0 })],
  ])('does not acquire the user lock for a %s order', async (_label, order) => {
    manager.findOne.mockResolvedValueOnce(order).mockResolvedValueOnce(order);

    await runFirstTerminalTransitionRecovery(manager as unknown as EntityManager, {
      orderId: 10,
      nextOrderStatus: OrderStatus.CANCELLED,
      pointsService,
      pointRestoreDescription: 'restore',
      applyMutations: async () => true,
    });

    expect(pointsService.lockUserForPointChanges).not.toHaveBeenCalled();
    expect(pointsService.creditFifo).not.toHaveBeenCalled();
  });

  it('propagates credit failures so the caller transaction rolls back all recovery writes', async () => {
    manager.findOne.mockResolvedValueOnce(makeOrder()).mockResolvedValueOnce(makeOrder());
    pointsService.creditFifo.mockRejectedValue(new Error('ledger unavailable'));

    await expect(
      runFirstTerminalTransitionRecovery(manager as unknown as EntityManager, {
        orderId: 10,
        nextOrderStatus: OrderStatus.CANCELLED,
        pointsService,
        pointRestoreDescription: 'restore',
        applyMutations: async () => true,
      }),
    ).rejects.toThrow('ledger unavailable');
  });
});

import { EntityManager } from 'typeorm';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { UserCoupon } from '../../coupons/entities/user-coupon.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { restoreOrderStock } from '../../orders/order-stock.util';
import { PointsService } from '../../points/points.service';

interface FirstTerminalTransitionRecoveryOptions {
  orderId: number;
  nextOrderStatus: OrderStatus;
  pointsService: Pick<PointsService, 'getRunningBalanceInTx'>;
  pointRestoreDescription: string;
  lockBeforeRecovery?: (lockedOrder: Order) => Promise<boolean>;
  applyMutations: (lockedOrder: Order) => Promise<boolean>;
}

interface FirstTerminalTransitionRecoveryResult {
  lockedOrder: Order | null;
  didMutate: boolean;
  didRestore: boolean;
}

export async function runFirstTerminalTransitionRecovery(
  manager: EntityManager,
  options: FirstTerminalTransitionRecoveryOptions,
): Promise<FirstTerminalTransitionRecoveryResult> {
  const lockedOrder = await manager.findOne(Order, {
    where: { id: options.orderId },
    lock: { mode: 'pessimistic_write' },
  });

  if (!lockedOrder) {
    return { lockedOrder: null, didMutate: false, didRestore: false };
  }

  if (options.lockBeforeRecovery && !(await options.lockBeforeRecovery(lockedOrder))) {
    return { lockedOrder, didMutate: false, didRestore: false };
  }

  const wasAlreadyTerminal = isRestoreTerminalStatus(lockedOrder.status);
  if (wasAlreadyTerminal && isRestoreTerminalStatus(options.nextOrderStatus)) {
    return { lockedOrder, didMutate: false, didRestore: false };
  }

  const didMutate = await options.applyMutations(lockedOrder);

  if (!didMutate || !isRestoreTerminalStatus(options.nextOrderStatus)) {
    return { lockedOrder, didMutate, didRestore: false };
  }

  await restoreOrderStock(manager, options.orderId);
  await restoreAppliedCoupon(manager, options.orderId);
  await restoreAppliedPoints(manager, lockedOrder, options.pointsService, options.pointRestoreDescription);

  return { lockedOrder, didMutate, didRestore: true };
}

function isRestoreTerminalStatus(status: OrderStatus): boolean {
  return status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED;
}

async function restoreAppliedCoupon(manager: EntityManager, orderId: number): Promise<void> {
  await manager.update(
    UserCoupon,
    { orderId, status: 'used' },
    { status: 'available', usedAt: null, orderId: null },
  );
}

async function restoreAppliedPoints(
  manager: EntityManager,
  order: Order,
  pointsService: Pick<PointsService, 'getRunningBalanceInTx'>,
  description: string,
): Promise<void> {
  if (!order.pointsUsed || order.pointsUsed <= 0 || order.userId == null) {
    return;
  }

  const currentBalance = await pointsService.getRunningBalanceInTx(manager, order.userId);
  await manager.save(PointHistory, {
    userId: order.userId,
    type: 'admin_adjust',
    amount: order.pointsUsed,
    balance: currentBalance + Number(order.pointsUsed),
    orderId: Number(order.id),
    description,
  });
}

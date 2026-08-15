import { EntityManager } from 'typeorm';
import { UserCoupon } from '../../coupons/entities/user-coupon.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { restoreOrderStock } from '../../orders/order-stock.util';
import { PointsService } from '../../points/points.service';

interface FirstTerminalTransitionRecoveryOptions {
  orderId: number;
  nextOrderStatus: OrderStatus;
  pointsService: Pick<PointsService, 'lockUserForPointChanges' | 'creditFifo'>;
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
  const recoveryCandidate = await manager.findOne(Order, {
    where: { id: options.orderId },
  });

  if (!recoveryCandidate) {
    return { lockedOrder: null, didMutate: false, didRestore: false };
  }

  if (shouldLockPointsUser(recoveryCandidate)) {
    await options.pointsService.lockUserForPointChanges(manager, Number(recoveryCandidate.userId));
  }

  const lockedOrder = await manager.findOne(Order, {
    where: { id: options.orderId },
    lock: { mode: 'pessimistic_write' },
  });

  if (!lockedOrder) {
    return { lockedOrder: null, didMutate: false, didRestore: false };
  }

  const wasAlreadyTerminal = isRestoreTerminalStatus(lockedOrder.status);
  if (wasAlreadyTerminal && isRestoreTerminalStatus(options.nextOrderStatus)) {
    return { lockedOrder, didMutate: false, didRestore: false };
  }

  if (options.lockBeforeRecovery && !(await options.lockBeforeRecovery(lockedOrder))) {
    return { lockedOrder, didMutate: false, didRestore: false };
  }

  const didMutate = await options.applyMutations(lockedOrder);

  if (!didMutate || !isRestoreTerminalStatus(options.nextOrderStatus)) {
    return { lockedOrder, didMutate, didRestore: false };
  }

  await restoreOrderStock(manager, options.orderId);
  await restoreAppliedCoupon(manager, options.orderId);
  await restoreAppliedPoints(
    manager,
    lockedOrder,
    options.pointsService,
    options.pointRestoreDescription,
  );

  return { lockedOrder, didMutate, didRestore: true };
}

function isRestoreTerminalStatus(status: OrderStatus): boolean {
  return status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED;
}

function shouldLockPointsUser(order: Order): boolean {
  return order.userId != null && Number(order.pointsUsed) > 0;
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
  pointsService: Pick<PointsService, 'creditFifo'>,
  description: string,
): Promise<void> {
  if (!order.pointsUsed || order.pointsUsed <= 0 || order.userId == null) {
    return;
  }

  await pointsService.creditFifo(
    manager,
    Number(order.userId),
    Number(order.pointsUsed),
    description,
    null,
    Number(order.id),
    null,
    null,
    'admin_adjust',
  );
}

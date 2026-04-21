import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';
import {
  formatInvalidTransitionMessage,
  isTransitionAllowed,
  TransitionMap,
} from '../../../common/policies/state-transition.policy';

export const ORDER_STATUS_TRANSITIONS: TransitionMap<OrderStatus> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID],
  [OrderStatus.PAID]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.PREPARING]: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.REFUND_REQUESTED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUND_REQUESTED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

export function canOrderStatusTransition(
  current: OrderStatus,
  next: OrderStatus,
  options?: { allowSameStatus?: boolean },
): boolean {
  return isTransitionAllowed(ORDER_STATUS_TRANSITIONS, current, next, options);
}

export function assertOrderStatusTransition(
  current: OrderStatus,
  next: OrderStatus,
  options?: { allowSameStatus?: boolean },
): void {
  if (!canOrderStatusTransition(current, next, options)) {
    throw new BadRequestException(formatInvalidTransitionMessage(current, next));
  }
}

import { BadRequestException } from '@nestjs/common';
import { ShippingStatus } from '../../payments/entities/shipping.entity';
import {
  formatInvalidTransitionMessage,
  isTransitionAllowed,
  TransitionMap,
} from '../../../common/policies/state-transition.policy';

export const SHIPPING_STATUS_TRANSITIONS: TransitionMap<ShippingStatus> = {
  [ShippingStatus.PAYMENT_CONFIRMED]: [ShippingStatus.PREPARING],
  [ShippingStatus.PREPARING]: [ShippingStatus.SHIPPED, ShippingStatus.FAILED],
  [ShippingStatus.SHIPPED]: [ShippingStatus.IN_TRANSIT, ShippingStatus.FAILED],
  [ShippingStatus.IN_TRANSIT]: [ShippingStatus.DELIVERED, ShippingStatus.FAILED],
  [ShippingStatus.DELIVERED]: [],
  [ShippingStatus.FAILED]: [],
};

export function canShippingStatusTransition(
  current: ShippingStatus,
  next: ShippingStatus,
  options?: { allowSameStatus?: boolean },
): boolean {
  return isTransitionAllowed(SHIPPING_STATUS_TRANSITIONS, current, next, options);
}

export function assertShippingStatusTransition(
  current: ShippingStatus,
  next: ShippingStatus,
  options?: { allowSameStatus?: boolean },
): void {
  if (!canShippingStatusTransition(current, next, options)) {
    throw new BadRequestException(formatInvalidTransitionMessage(current, next));
  }
}

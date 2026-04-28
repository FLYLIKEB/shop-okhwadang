import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { TierUpgradedEvent, TIER_UPGRADED_EVENT } from './events/tier-upgraded.event';

/**
 * MembershipEventEmitter
 *
 * Lightweight event bus for membership tier events.
 * Export this from MembershipModule so other modules (e.g. issue #514)
 * can subscribe to tier-up events without circular dependencies.
 *
 * Usage in subscriber:
 *   constructor(private readonly membershipEvents: MembershipEventEmitter) {
 *     this.membershipEvents.onTierUpgraded((event) => { ... });
 *   }
 */
@Injectable()
export class MembershipEventEmitter {
  private readonly emitter = new EventEmitter();

  emitTierUpgraded(event: TierUpgradedEvent): void {
    this.emitter.emit(TIER_UPGRADED_EVENT, event);
  }

  onTierUpgraded(handler: (event: TierUpgradedEvent) => void): void {
    this.emitter.on(TIER_UPGRADED_EVENT, handler);
  }
}
